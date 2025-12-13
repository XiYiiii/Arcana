
import React, { useState, useEffect, useRef } from 'react';
import { Card, GamePhase, InstantWindow, GameState, PlayerState, EffectContext, PendingEffect, Keyword, CardDefinition } from '../../../types';
import { generateDeck, shuffleDeck } from '../../../services/gameUtils';
import { drawCards, discardCards, getOpponentId, destroyCard, updateQuestProgress } from '../../../services/actions'; 
import { MAX_HAND_SIZE, INITIAL_ATK } from '../../../constants';
import { CARD_DEFINITIONS } from '../../../data/cards';

import { PhaseBar } from '../../PhaseBar';
import { PlayerArea } from '../../PlayerArea';
import { FieldArea } from '../../FieldArea';
import { InteractionOverlay, EffectOverlay, GameOverOverlay, DebugOverlay, GalleryOverlay, CardPileOverlay } from '../../overlays';
import { VisualEffectsLayer } from '../../VisualEffectsLayer';
import { GameLogSidebar } from '../../GameLogSidebar';

// Import Logic Phases
import { executeDrawPhase } from '../../../logic/phases/draw';
import { executeSetPhase } from '../../../logic/phases/set';
import { executeFlipCards, executeResolveEffects } from '../../../logic/phases/reveal';
import { executeDiscardPhase } from '../../../logic/phases/discard';

interface PVEGameProps {
    enabledCardIds: string[];
    initialHp: number;
    initialHandSize: number;
    onExit: () => void;
}

export const PVEGame: React.FC<PVEGameProps> = ({ enabledCardIds, initialHp, initialHandSize, onExit }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [p1SelectedCardId, setP1SelectedCardId] = useState<string | null>(null);
  const [p2SelectedCardId, setP2SelectedCardId] = useState<string | null>(null);
  
  // Debug & UI State
  const [showDebug, setShowDebug] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [revealAIHand, setRevealAIHand] = useState(false); // PVE Exclusive Cheat
  
  // Pile Viewer State
  const [viewingPile, setViewingPile] = useState<{ type: 'DISCARD' | 'DECK' | 'VAULT', pid: number, cards: Card[], title: string, sorted?: boolean } | null>(null);

  // Visual Effect Resolver
  const activeEffectResolverRef = useRef<(() => void) | null>(null);

  const gameStateRef = useRef<GameState | null>(null);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  const addLog = (message: string) => {
    setGameState(prev => prev ? ({ ...prev, logs: [message, ...prev.logs] }) : null);
  };

  // --- Helper Wrapper for Context ---
  const createEffectContext = (playerId: number, card: Card): EffectContext => {
     const p = (playerId === 1 ? gameStateRef.current?.player1 : gameStateRef.current?.player2) || gameStateRef.current?.player1!; 
     return {
       gameState: gameStateRef.current!,
       sourcePlayerId: playerId,
       card,
       setGameState,
       log: addLog,
       isReversed: p?.isReversed,
       gameMode: 'LOCAL' 
     };
  };

  // --- INTELLIGENT AI UTILITY SCORING ---
  const calculateCardUtility = (card: Card, ai: PlayerState, opp: PlayerState, field: any): number => {
      let score = 50; // Base score

      // Helper: Estimate damage
      let estimatedDmg = 0;
      if (card.name.includes('太阳')) estimatedDmg = 2 * ai.atk;
      else if (card.name.includes('恶魔')) estimatedDmg = ai.atk;
      else if (card.name.includes('战车')) estimatedDmg = ai.atk * 0.8;
      else if (card.name.includes('宝剑·愚者')) estimatedDmg = 2 * ai.atk;
      
      // 1. LETHALITY
      if (estimatedDmg >= opp.hp) return 9999; 
      score += estimatedDmg * 2;

      // 2. SURVIVAL
      const isLowHp = ai.hp <= 15;
      const isCriticalHp = ai.hp <= 8;

      if (isLowHp) {
          if (card.name.includes('女祭司') || card.name.includes('圣杯·月亮') || card.name.includes('死神')) {
              score += isCriticalHp ? 200 : 50;
          }
          if (card.name.includes('宝剑·愚者') || card.name.includes('宝剑·魔术师')) {
              score -= 100;
          }
      }

      // 3. RESOURCE MANAGEMENT
      if (ai.hand.length <= 2) {
          if (card.keywords?.includes(Keyword.SCRY) || card.name.includes('战车') || card.name.includes('星星')) {
              score += 40;
          }
      }

      // 4. FIELD LOGIC
      if (!field && card.keywords?.includes(Keyword.FIELD)) {
          score += 30;
      }
      if (field && field.ownerId !== ai.id && (field.card.name.includes('死神') || field.card.name.includes('审判'))) {
          if (card.keywords?.includes(Keyword.FIELD) || card.name.includes('力量')) {
              score += 60;
          }
      }

      // 5. SPECIFIC COMBOS & SYNERGIES
      if (card.name.includes('权杖·星星')) {
          const hasTargets = ai.deck.some(c => c.name.includes('太阳') || c.name.includes('月亮'));
          score += hasTargets ? 50 : -30;
      }
      if (card.name.includes('星币·皇帝')) {
          score += (ai.hp > 20) ? 40 : -50;
      }
      if (card.name.includes('宝剑·正义')) {
          const diff = opp.hand.length - ai.hand.length;
          if (diff > 0) score += diff * 15;
      }
      
      if (card.isTreasure) score += 25;

      // 6. RANDOM FUZZ
      score += Math.random() * 15;

      return score;
  };

  // --- Initialization ---
  useEffect(() => {
      const allowedDefs = CARD_DEFINITIONS.filter(c => enabledCardIds.includes(c.id) || c.isTreasure);
      
      const finalDefs = allowedDefs.length < 10 ? CARD_DEFINITIONS : allowedDefs;
      if (allowedDefs.length < 10) {
          console.warn("Selected deck too small, reverting to full deck.");
      }

      const p1Deck = shuffleDeck(generateDeck(1, finalDefs));
      const p2Deck = shuffleDeck(generateDeck(2, finalDefs));
      
      const p1Hand = p1Deck.splice(0, initialHandSize);
      const p2Hand = p2Deck.splice(0, initialHandSize);

      const initialPlayerState = (id: number, deck: Card[], hand: Card[]): PlayerState => ({
        id, name: id === 1 ? "玩家" : "AI 对手", 
        hp: initialHp, atk: INITIAL_ATK,
        deck, hand, discardPile: [],
        fieldSlot: null, isFieldCardRevealed: false,
        immunityThisTurn: false, immunityNextTurn: false, effectDoubleNext: false,
        isReversed: false, isInvalidated: false, hpRecoverNextTurn: 0, invalidateNextPlayedCard: false, invalidateNextTurn: false,
        preventTransform: 0,
        preventHealing: false, hasLifesteal: false, damageReflection: false, incomingDamageConversion: false, nextDamageDouble: false,
        swordsHangedManActive: false,
        damageTakenThisTurn: 0,
        piercingDamageThisTurn: false,
        piercingDamageNextTurn: false,
        delayedEffects: [],
        maxHandSize: MAX_HAND_SIZE, skipDiscardThisTurn: false,
        quests: [],
        swordsSunDamageMult: 1, 
      });

      setGameState({
        phase: GamePhase.DRAW,
        instantWindow: InstantWindow.NONE,
        turnCount: 1,
        logs: ["PVE 模式开始。", `初始生命: ${initialHp}, 手牌: ${initialHandSize}`],
        player1: initialPlayerState(1, p1Deck, p1Hand),
        player2: initialPlayerState(2, p2Deck, p2Hand),
        playerReadyState: { 1: false, 2: false },
        field: null,
        isResolving: false,
        pendingEffects: [],
        activeEffect: null,
        interaction: null,
        visualEvents: []
      });
  }, [enabledCardIds, initialHp, initialHandSize]);

  // --- Visual Events Cleanup ---
  const handleVisualEventComplete = (id: string) => {
      setGameState(prev => {
          if (!prev) return null;
          return {
              ...prev,
              visualEvents: prev.visualEvents.filter(e => e.id !== id)
          };
      });
  };

  // --- Rule: Empty Hand Check (Or All Locked) ---
  useEffect(() => {
    if (!gameState) return;
    const checkPlayer = (pid: number) => {
      const p = pid === 1 ? gameState.player1 : gameState.player2;
      
      const isHandEmpty = p.hand.length === 0;
      const isAllLocked = p.hand.length > 0 && p.hand.every(c => c.isLocked);

      if ((isHandEmpty || isAllLocked) && p.deck.length > 0) {
         const cardSource = p.deck[0];
         if (cardSource) {
            addLog(`[规则] ${p.name} 手牌耗尽或全被锁定，强制补牌。`);
            const ctx = createEffectContext(pid, cardSource);
            drawCards(ctx, pid, 1);
         }
      }
    };

    checkPlayer(1);
    checkPlayer(2);
  }, [gameState?.player1.hand, gameState?.player2.hand]);

  // --- Quest Check ---
  useEffect(() => {
      if (!gameState) return;
      const checkWandsStarQuest = (pid: number) => {
          const p = pid === 1 ? gameState.player1 : gameState.player2;
          const hasQuest = p.quests.some(q => q.id === 'quest-wands-star');
          if (hasQuest) {
              const hasSun = p.hand.some(c => c.name.includes('太阳'));
              const hasMoon = p.hand.some(c => c.name.includes('月亮'));
              if (hasSun && hasMoon) {
                  const ctx = createEffectContext(pid, p.hand[0] || {id:'dummy', name:'dummy'} as any);
                  updateQuestProgress(ctx, pid, 'quest-wands-star', 1);
              }
          }
      }
      checkWandsStarQuest(1);
      checkWandsStarQuest(2);
  }, [gameState?.player1.hand, gameState?.player2.hand]); 

  // --- Effect Queue Processor ---
  useEffect(() => {
    if (!gameState) return;
    if (gameState.activeEffect || gameState.interaction) return;
    if (gameState.pendingEffects.length === 0) return;

    const effect = gameState.pendingEffects[0];
    setGameState(prev => {
       if (!prev) return null;
       return {
          ...prev,
          pendingEffects: prev.pendingEffects.slice(1),
          activeEffect: effect
       };
    });
  }, [gameState?.pendingEffects, gameState?.activeEffect, gameState?.interaction]);

  // --- Active Effect Logic ---
  const dismissActiveEffect = () => {
     if (gameState?.activeEffect) {
         const effect = gameState.activeEffect;
         if (effect.type === 'ON_DRAW' && effect.card.onDraw) {
            effect.card.onDraw(createEffectContext(effect.playerId, effect.card));
         } else if (effect.type === 'ON_DISCARD' && effect.card.onDiscard) {
            effect.card.onDiscard(createEffectContext(effect.playerId, effect.card));
         }
         
         setGameState(prev => prev ? ({ ...prev, activeEffect: null }) : null);
         
         if (activeEffectResolverRef.current) {
             activeEffectResolverRef.current();
             activeEffectResolverRef.current = null;
         }
     }
  };

  const triggerVisualEffect = async (type: PendingEffect['type'], card: Card, pid: number, desc?: string) => {
      return new Promise<void>((resolve) => {
          activeEffectResolverRef.current = resolve;
          setGameState(prev => {
              if (!prev) return null;
              return { ...prev, activeEffect: { type, card, playerId: pid, description: desc } };
          });
      });
  };

  // --- AI Logic (Player 2) ---
  useEffect(() => {
      if (!gameState) return;
      const { phase, player2, player1, field, interaction } = gameState;

      // 1. SET Phase: Strategic Selection
      if (phase === GamePhase.SET && !p2SelectedCardId) {
          const timer = setTimeout(() => {
              const hand = player2.hand;
              const isSwordsStarActive = field?.active && field.card.name.includes('宝剑·星星');

              // Filter valid cards
              const validCards = hand.filter(c => {
                   const locked = c.isLocked; // Simplified check for AI
                   const canSetRule = c.canSet !== false || (isSwordsStarActive && c.name.includes('太阳'));
                   return !locked && canSetRule;
              });

              if (validCards.length > 0) {
                  // Calculate Utility Scores
                  const scoredCards = validCards.map(c => ({
                      card: c,
                      score: calculateCardUtility(c, player2, player1, field)
                  }));

                  scoredCards.sort((a, b) => b.score - a.score);
                  const bestCard = scoredCards[0].card;
                  
                  console.log(`[AI Thinking] Top pick: ${bestCard.name} (Score: ${scoredCards[0].score.toFixed(1)})`);
                  setP2SelectedCardId(bestCard.instanceId);
              }
          }, 1500 + Math.random() * 1000); 
          return () => clearTimeout(timer);
      }
      
      // 2. DISCARD Phase
      if (phase === GamePhase.DISCARD) {
          const hand = player2.hand.filter(c => !c.isTreasure);
          if (hand.length > player2.maxHandSize && !player2.skipDiscardThisTurn) {
               const timer = setTimeout(() => {
                   const discardable = [...hand].sort((a,b) => a.rank - b.rank);
                   // Discard largest rank (usually slowest/utility)
                   const toDiscard = discardable[discardable.length - 1]; 
                   
                   const ctx = createEffectContext(2, toDiscard);
                   discardCards(ctx, 2, [toDiscard.instanceId]);
               }, 1000);
               return () => clearTimeout(timer);
          }
      }
  }, [gameState]);

  // --- Phase Handlers ---
  const onDrawPhase = () => executeDrawPhase({ gameState, setGameState, createEffectContext });
  
  const onSetPhase = () => {
      executeSetPhase({ setGameState, p1SelectedCardId, p2SelectedCardId });
      setP1SelectedCardId(null);
      setP2SelectedCardId(null);
  };
  
  const onFlip = () => {
      executeFlipCards({ gameState, setGameState, addLog });
      setP1SelectedCardId(null);
      setP2SelectedCardId(null);
  };
  
  const onResolve = () => executeResolveEffects({ gameStateRef, setGameState, addLog, createEffectContext, triggerVisualEffect });
  const onDiscard = () => executeDiscardPhase({ gameState, setGameState, createEffectContext });

  // --- Interactions ---
  const handleCardClick = (player: PlayerState, card: Card) => {
    if (!gameState) return;
    if (gameState?.isResolving || gameState?.phase === GamePhase.GAME_OVER) return;

    if (gameState?.phase === GamePhase.SET) {
      if (player.id === 1) setP1SelectedCardId(card.instanceId === p1SelectedCardId ? null : card.instanceId);
    } 
    else if (gameState?.instantWindow !== InstantWindow.NONE) {
       if (player.id === 1) setP1SelectedCardId(card.instanceId === p1SelectedCardId ? null : card.instanceId);
    }
    else if (gameState?.phase === GamePhase.DISCARD) {
      if (card.isTreasure) {
          addLog(`[规则] 宝藏牌无法被弃置！`);
          return;
      }
      const ctx = createEffectContext(player.id, card);
      discardCards(ctx, player.id, [card.instanceId]);
    }
  };

  const handleInstantUse = async (player: PlayerState, cardInstanceId: string | null) => {
    if (!cardInstanceId || !gameState || gameState.isResolving) return;
    const card = player.hand.find(c => c.instanceId === cardInstanceId);
    if (!card || !card.onInstant) return;

    if (card.isLocked) {
        addLog("此牌被锁定，无法使用。");
        return;
    }

    if (card.canInstant && !card.canInstant(gameState.instantWindow)) {
       addLog("当前时机无法使用此卡的插入效果。");
       return;
    }

    const oppId = getOpponentId(player.id);
    const opp = oppId === 1 ? gameState.player1 : gameState.player2;
    const moon = opp.hand.find(c => c.name.includes('月亮') && c.suit === 'WANDS'); 

    if (moon && !card.isTreasure) {
       // AI Interrupt Logic (Simplified: AI always interrupts if possible)
       addLog(`[月亮] 触发！AI使用 [${moon.name}] 无效了您的 [${card.name}]！`);
       const ctx = createEffectContext(oppId, moon);
       destroyCard(ctx, moon.instanceId);
       // Instant is consumed but effect cancelled
       return;
    }

    setGameState(prev => prev ? ({ ...prev, isResolving: true }) : null);
    await triggerVisualEffect('INSTANT', card, player.id, "发动插入特效！");
    card.onInstant && card.onInstant(createEffectContext(player.id, card));
    
    setGameState(prev => {
        if (!prev) return null;
        const key = player.id === 1 ? 'player1' : 'player2';
        const p = prev[key];
        const stillInHand = p.hand.find(c => c.instanceId === card.instanceId);
        
        if (stillInHand && stillInHand.id === card.id) {
           return {
              ...prev,
              isResolving: false,
              [key]: { 
                  ...p, 
                  hand: p.hand.filter(c => c.instanceId !== card.instanceId), 
                  discardPile: [...p.discardPile, card] 
              }
           };
        }
        return { ...prev, isResolving: false };
    });

    setP1SelectedCardId(null);
  };
  
  // --- Viewer Handlers ---
  const openPileView = (type: 'DISCARD' | 'DECK' | 'VAULT', pid: number) => {
      if (!gameState) return;
      const player = pid === 1 ? gameState.player1 : gameState.player2;
      
      let cards: Card[] = [];
      let title = "";
      let sorted = false;
      
      if (type === 'DISCARD') {
          cards = player.discardPile;
          title = `${player.name} 的弃牌堆`;
      } else if (type === 'DECK') {
          cards = player.deck;
          title = `${player.name} 的抽牌堆 (查看)`;
          sorted = true;
      } else if (type === 'VAULT') {
          const treasures = CARD_DEFINITIONS.filter(c => c.isTreasure).map(t => ({...t, instanceId: `vault-${t.id}`, marks: [], description: t.description || ""}));
          cards = treasures;
          title = `${player.name} 的宝库`;
      }
      
      setViewingPile({ type, pid, cards, title, sorted });
  };

  if (!gameState) return <div className="bg-stone-900 h-screen text-stone-400 flex items-center justify-center font-serif">Initializing PVE...</div>;

  const { phase, instantWindow, player1, player2, isResolving, activeEffect, interaction, field } = gameState;
  const isSwordsStarActive = field?.active && field.card.name.includes('宝剑·星星');

  const p1Sel = player1.hand.find(c => c.instanceId === p1SelectedCardId);
  const canSetP1 = player1.hand.length > 0 ? (p1Sel && (p1Sel.canSet !== false || (isSwordsStarActive && p1Sel.name.includes('太阳'))) && !p1Sel.isLocked) : true;
  const canInstantP1 = p1Sel && p1Sel.canInstant?.(instantWindow) && !p1Sel.isLocked;
  
  const p1HandCount = player1.hand.filter(c => !c.isTreasure).length;
  const p1MustDiscard = p1HandCount > player1.maxHandSize && !player1.skipDiscardThisTurn;

  const getActionButton = () => {
    if (phase === GamePhase.GAME_OVER) {
        return <div className="text-2xl font-black text-red-600 animate-pulse font-serif">游戏结束</div>;
    }
    const commonClasses = "w-full py-3 rounded-lg font-serif font-black text-lg tracking-widest shadow-md transition-all transform duration-200 border-b-4 active:border-b-0 active:translate-y-1";
    
    if (phase === GamePhase.DRAW) return <button onClick={onDrawPhase} className={`${commonClasses} bg-stone-700 hover:bg-stone-600 hover:shadow-stone-500/20 text-stone-200 border-stone-900`}>抽牌阶段</button>;
    if (phase === GamePhase.SET) {
       const disabled = !canSetP1 || !p2SelectedCardId; // Wait for AI
       return <button onClick={onSetPhase} disabled={disabled} className={`${commonClasses} ${disabled ? 'bg-stone-800 border-stone-900 text-stone-600 cursor-not-allowed' : 'bg-emerald-800 hover:bg-emerald-700 text-emerald-100 border-emerald-950 shadow-emerald-900/30'}`}>{!p2SelectedCardId ? "等待 AI 思考..." : "确认盖牌"}</button>;
    }
    if (phase === GamePhase.REVEAL) {
       if (instantWindow === InstantWindow.BEFORE_REVEAL) return <button onClick={onFlip} className={`${commonClasses} bg-amber-800 hover:bg-amber-700 text-amber-100 border-amber-950 shadow-amber-900/30`}>揭示卡牌</button>;
       if (instantWindow === InstantWindow.AFTER_REVEAL) return <button onClick={onResolve} className={`${commonClasses} bg-indigo-900 hover:bg-indigo-800 text-indigo-100 border-black shadow-indigo-900/30`}>结算效果</button>;
       return <button className={`${commonClasses} bg-stone-800 text-stone-500 border-stone-950`} disabled>结算中...</button>;
    }
    if (phase === GamePhase.DISCARD) {
       const disabled = p1MustDiscard;
       return <button onClick={onDiscard} disabled={disabled} className={`${commonClasses} ${disabled ? 'bg-stone-800 text-red-400 border-stone-950' : 'bg-stone-700 hover:bg-stone-600 text-stone-200 border-stone-900'}`}>{disabled ? "请先弃牌" : "结束回合"}</button>;
    }
    return null;
  };

  return (
    <div className="h-screen bg-stone-900 flex flex-row font-sans text-stone-300 overflow-hidden selection:bg-amber-900/50 relative">
      <GameLogSidebar logs={gameState.logs} currentPlayerId={null} />

      <div className="flex-1 flex flex-col relative h-full overflow-hidden">
          <div className="absolute inset-0 bg-stone-900 z-0"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(28,25,23,0)_0%,_rgba(0,0,0,0.5)_100%)] z-0 pointer-events-none"></div>
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] z-0"></div>
          
          <VisualEffectsLayer events={gameState.visualEvents} onEventComplete={handleVisualEventComplete} />

          {/* Top Bar - With Reveal AI Hand Toggle */}
          <div className="absolute top-4 right-4 z-50 flex gap-3">
             <button 
               onClick={onExit} 
               className="text-[10px] bg-stone-900/60 text-red-400 hover:text-red-300 px-3 py-2 rounded border border-red-900/30 backdrop-blur"
             >
               退出游戏
             </button>
             <button 
               onClick={() => setShowGallery(!showGallery)} 
               className="text-[10px] font-serif font-bold bg-stone-900/60 text-amber-600 hover:text-amber-500 px-4 py-2 rounded border border-amber-900/30 backdrop-blur"
             >
               📖 卡牌图鉴
             </button>
             {/* PVE Reveal Cheat Button */}
             <button 
                onClick={() => setRevealAIHand(!revealAIHand)} 
                className={`text-[10px] font-bold px-3 py-2 rounded border backdrop-blur transition-all duration-300 flex items-center gap-1
                    ${revealAIHand 
                        ? 'bg-purple-900/80 text-purple-200 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]' 
                        : 'bg-stone-900/60 text-stone-500 border-stone-800 hover:text-stone-300'
                    }`}
             >
                {revealAIHand ? '👁️ AI手牌可见' : '🙈 透视AI'}
             </button>
             <button 
               onClick={() => setShowDebug(!showDebug)} 
               className="text-[10px] bg-stone-900/60 text-stone-600 hover:text-stone-400 px-3 py-2 rounded border border-stone-800 backdrop-blur"
             >
               调试
             </button>
          </div>

          {showGallery && <GalleryOverlay onClose={() => setShowGallery(false)} />}
          {viewingPile && <CardPileOverlay title={viewingPile.title} cards={viewingPile.cards} onClose={() => setViewingPile(null)} sorted={viewingPile.sorted} />}
          {showDebug && <DebugOverlay gameState={gameState} setGameState={setGameState} createEffectContext={createEffectContext} onClose={() => setShowDebug(false)} />}
          {phase === GamePhase.GAME_OVER && <GameOverOverlay result={gameState.logs[0]} onRestart={onExit} />}
          {activeEffect && <EffectOverlay effect={activeEffect} onDismiss={dismissActiveEffect} />}
          {interaction && <InteractionOverlay request={interaction} />}

          <PhaseBar currentPhase={phase} turn={gameState.turnCount} />
          
          <div className="bg-stone-900/80 backdrop-blur text-center text-[10px] py-1.5 border-b border-stone-800/50 shadow-lg relative z-30">
             <span className="text-amber-700 font-bold tracking-wider uppercase mr-2">状态:</span>
             <span className="text-stone-400 font-serif">
                {instantWindow === InstantWindow.NONE ? '等待中...' : 
                 instantWindow === InstantWindow.BEFORE_SET ? '置牌前时机' :
                 instantWindow === InstantWindow.BEFORE_REVEAL ? '亮牌前时机' :
                 instantWindow === InstantWindow.AFTER_REVEAL ? '亮牌后时机' : '结算中...'}
             </span>
             {gameState.field && <span className="ml-4 text-emerald-500 font-serif font-bold">🏟️ 场地: {gameState.field.card.name}</span>}
             <span className="ml-4 text-xs font-bold text-stone-500">[PVE 挑战]</span>
          </div>

          {isResolving && !activeEffect && !interaction && (
             <div className="absolute inset-0 z-[45] flex items-center justify-center pointer-events-none">
                <div className="bg-black/70 text-amber-500 px-8 py-4 rounded-xl text-lg font-serif font-bold shadow-2xl backdrop-blur-md border border-amber-900/30 animate-pulse">
                   AI 思考中...
                </div>
             </div>
          )}

          <div className="flex-grow flex flex-col relative overflow-hidden z-10">
            {/* Player 2 (AI) - Hide hand unless revealed */}
            <PlayerArea 
              player={player2} isOpponent phase={phase} 
              selectedCardId={p2SelectedCardId} mustDiscard={false}
              canSet={false} canInstant={false} isResolving={isResolving} instantWindow={instantWindow}
              onSelect={() => {}} onInstant={() => {}}
              onViewDiscard={() => openPileView('DISCARD', 2)}
              onViewDeck={() => openPileView('DECK', 2)}
              onViewVault={() => openPileView('VAULT', 2)}
              enableControls={false}
              hideHand={!revealAIHand} // Controlled by Toggle
            />
            
            <FieldArea gameState={gameState} player1={player1} player2={player2} />

            <PlayerArea 
              player={player1} phase={phase} 
              selectedCardId={p1SelectedCardId} mustDiscard={p1MustDiscard}
              canSet={canSetP1} canInstant={!!canInstantP1} isResolving={isResolving} instantWindow={instantWindow}
              onSelect={(c) => handleCardClick(player1, c)} onInstant={(id) => handleInstantUse(player1, id)}
              onViewDiscard={() => openPileView('DISCARD', 1)}
              onViewDeck={() => openPileView('DECK', 1)}
              onViewVault={() => openPileView('VAULT', 1)}
              enableControls={true}
              hideHand={false}
            />
          </div>

          <div className="bg-stone-900/80 backdrop-blur-md border-t border-stone-800/50 p-4 flex justify-center items-center h-24 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-30 relative shrink-0">
             <div className="w-full max-w-sm flex items-center justify-center">
                {getActionButton()}
             </div>
          </div>
      </div>
    </div>
  );
}
