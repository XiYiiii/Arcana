
import { GamePhase, InstantWindow, EffectContext, Card, PendingEffect, Keyword } from '../../types';
import { damagePlayer, modifyPlayer, getOpponentId, drawCards, destroyCard, updateQuestProgress } from '../../services/actions';
import { compareCards } from '../../services/gameUtils';

const DELAY_MS = 600; 
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const executeFlipCards = async (
  ctx: { 
    gameState: any, 
    setGameState: any, 
    addLog: (msg: string) => void,
    setP1SelectedCardId: any,
    setP2SelectedCardId: any
  }
) => {
  const { gameState, setGameState, addLog, setP1SelectedCardId, setP2SelectedCardId } = ctx;
  
  if (!gameState || gameState.isResolving) return;
  setGameState(prev => prev ? ({ ...prev, isResolving: true }) : null);
  
  addLog("揭示卡牌！");
  await delay(DELAY_MS/2);

  setGameState(prev => prev ? ({
    ...prev,
    player1: { ...prev.player1, isFieldCardRevealed: true },
    player2: { ...prev.player2, isFieldCardRevealed: true }
  }) : null);

  await delay(DELAY_MS);

  // Reset selections
  setP1SelectedCardId(null);
  setP2SelectedCardId(null);

  setGameState(prev => prev ? ({
    ...prev,
    isResolving: false,
    instantWindow: InstantWindow.AFTER_REVEAL, 
    logs: ["卡牌已揭示。进入【亮牌后】时机。", ...prev.logs]
  }) : null);
};

export const executeResolveEffects = async (
  ctx: { 
    gameStateRef: any, 
    setGameState: any, 
    addLog: (msg: string) => void,
    createEffectContext: (pid: number, card: Card) => EffectContext,
    triggerVisualEffect: (type: PendingEffect['type'], card: Card, pid: number, desc?: string) => Promise<void>
  }
) => {
  const { gameStateRef, setGameState, addLog, createEffectContext, triggerVisualEffect } = ctx;
  
  if (!gameStateRef.current || gameStateRef.current.isResolving) return;
  setGameState(prev => prev ? ({ ...prev, isResolving: true, instantWindow: InstantWindow.NONE }) : null);

  // 1. Rule Damage
  addLog("结算规则伤害...");
  await delay(DELAY_MS/2);
  
  const applyRuleDamage = (c: EffectContext, pid: number) => {
    const p = pid === 1 ? c.gameState.player1 : c.gameState.player2;
    const opp = pid === 1 ? c.gameState.player2 : c.gameState.player1;
    const dmg = opp.atk;
    if (p.immunityThisTurn) addLog(`${p.name} 免疫了规则伤害。`);
    else damagePlayer(c, pid, dmg);
  };

  if (gameStateRef.current) {
     const ctx1 = createEffectContext(1, gameStateRef.current.player1.fieldSlot!); 
     applyRuleDamage(ctx1, 1);
     applyRuleDamage(ctx1, 2);
  }
  await delay(DELAY_MS);

  // 2. Resolve Status Phase
  const p1CardStatus = gameStateRef.current!.player1.fieldSlot;
  const p2CardStatus = gameStateRef.current!.player2.fieldSlot;
  
  const runStatus = async (pid: number, c: Card) => {
      if (c.onResolveStatus) {
         const curState = gameStateRef.current;
         const p = pid === 1 ? curState?.player1 : curState?.player2;
         
         // Check Invalidation (Standard + Temperance Flag)
         if ((p?.isInvalidated || p?.invalidateNextPlayedCard || c.marks.includes('mark-invalidated')) && !c.isTreasure) {
            addLog(`[无效] ${p.name} 的 ${c.name} 先制效果被无效！`);
            return;
         }
         await triggerVisualEffect('STATUS_PHASE', c, pid, "发动先制效果！");
         c.onResolveStatus(createEffectContext(pid, c));
         await delay(DELAY_MS);
      }
  };
  if (p1CardStatus) await runStatus(1, p1CardStatus);
  if (p2CardStatus) await runStatus(2, p2CardStatus);

  // 3. Main Phase
  const p1Card = gameStateRef.current!.player1.fieldSlot;
  const p2Card = gameStateRef.current!.player2.fieldSlot;
  const comparison = compareCards(p1Card, p2Card);
  const executionOrder = comparison < 0 ? [1, 2] : comparison > 0 ? [2, 1] : [1, 2];

  for (const pid of executionOrder) {
     const curState = gameStateRef.current;
     if (!curState) break;
     const p = pid === 1 ? curState.player1 : curState.player2;
     const card = p.fieldSlot;

     if (card) {
       const effCtx = createEffectContext(pid, card);
       
       // Swords Sun Quest Check
       if (card.name.includes('太阳')) {
            updateQuestProgress(effCtx, pid, 'quest-swords-sun', 1);
       }

       // Check Invalidation
       if ((p.isInvalidated || p.invalidateNextPlayedCard || card.marks.includes('mark-invalidated')) && !card.isTreasure) { 
           addLog(`[无效] ${p.name} 的 [${card.name}] 被无效了！`);
           // Consume flag
           modifyPlayer(effCtx, pid, pl => ({ ...pl, invalidateNextPlayedCard: false }));
           await delay(DELAY_MS);
           continue; 
       }
       // Consume flag if it wasn't triggered
       if (p.invalidateNextPlayedCard) {
            modifyPlayer(effCtx, pid, pl => ({ ...pl, invalidateNextPlayedCard: false }));
       }

       if (p.isReversed && !card.isTreasure) {
           addLog(`[反转] ${p.name} 的 [${card.name}] 效果将反转！`);
       }

       // --- MARK TRIGGERS ---

       // Wands Empress Mark: Trigger OnDraw
       if (card.marks.includes('mark-wands-empress')) {
           if (card.onDraw) {
               addLog(`[权杖·女皇] 印记触发！执行 [${card.name}] 的抽到效果。`);
               card.onDraw(effCtx);
               const checkForInteraction = async () => { while (gameStateRef.current?.interaction) await delay(200); };
               await checkForInteraction();
               await delay(DELAY_MS/2);
           }
       }

       // Swords Hanged Man (Recover 2HP on play)
       if (card.marks.includes('mark-swords-hangedman')) {
          addLog(`[倒吊人] 标记触发！${p.name} 恢复 2 点生命。`);
          modifyPlayer(effCtx, pid, pl => ({ ...pl, hp: pl.hp + 2 }));
          await delay(200);
       }
       // Swords Devil (Extra 1 Dmg to opp)
       if (card.marks.includes('mark-swords-devil')) {
           addLog(`[宝剑·恶魔] 标记触发！额外造成1点伤害。`);
           damagePlayer(effCtx, getOpponentId(pid), 1);
           await delay(200);
       }
       // Swords Tower (Self 1 Dmg)
       if (card.marks.includes('mark-swords-tower')) {
           addLog(`[宝剑·高塔] 标记触发！自伤1点。`);
           damagePlayer(effCtx, pid, 1);
           await delay(200);
       }
       
       if (card.onReveal) {
          const isDouble = p.effectDoubleNext || card.marks.includes('mark-cups-magician');
          const times = isDouble ? 2 : 1;
          if (card.marks.includes('mark-cups-magician')) addLog(`[魔术师] 标记触发！效果发动两次。`);

          for(let i=0; i<times; i++) {
             await triggerVisualEffect('ON_REVEAL', card, pid, `${p.name} 发动 [${card.name}]`);
             card.onReveal(effCtx);
             const checkForInteraction = async () => { while (gameStateRef.current?.interaction) await delay(200); };
             await checkForInteraction();
             await delay(DELAY_MS);
          }
          if (p.effectDoubleNext) modifyPlayer(effCtx, pid, pl => ({ ...pl, effectDoubleNext: false }));
       }

       if (card.marks.includes('mark-death') || card.keywords?.includes(Keyword.DESTROY)) {
           if(card.name.includes('死神') || card.name.includes('世界')) {
               destroyCard(effCtx, card.instanceId);
           }
       }
     }
  }

  setGameState(prev => prev ? ({ 
    ...prev, 
    phase: GamePhase.DISCARD, 
    instantWindow: InstantWindow.NONE,
    isResolving: false 
  }) : null);
};
