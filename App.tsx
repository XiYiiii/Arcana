

import React, { useState, useEffect, useRef } from 'react';
import { Card, GamePhase, InstantWindow, GameState, PlayerState, EffectContext, PendingEffect, Keyword, CardDefinition } from './types';
import { generateDeck, shuffleDeck } from './services/gameUtils';
import { drawCards, discardCards, getOpponentId, destroyCard } from './services/actions'; 
import { MAX_HAND_SIZE, INITIAL_HP, INITIAL_ATK } from './constants';
import { CARD_DEFINITIONS } from './data/cards';

import { PhaseBar } from './components/PhaseBar';
import { PlayerArea } from './components/PlayerArea';
import { FieldArea } from './components/FieldArea';
import { InteractionOverlay, EffectOverlay, GameOverOverlay, DebugOverlay, GalleryOverlay, DiscardOverlay } from './components/overlays';
import { StartScreen } from './components/screens/StartScreen';
import { GameSetupScreen } from './components/screens/GameSetupScreen';

// Import Logic Phases
import { executeDrawPhase } from './logic/phases/draw';
import { executeSetPhase } from './logic/phases/set';
import { executeFlipCards, executeResolveEffects } from './logic/phases/reveal';
import { executeDiscardPhase } from './logic/phases/discard';

type AppMode = 'MENU' | 'BUILDER' | 'GAME';

export default function App() {
  // App Mode State
  const [appMode, setAppMode] = useState<AppMode>('MENU');
  
  // Game Configuration State
  const [enabledCardIds, setEnabledCardIds] = useState<string[]>(
      CARD_DEFINITIONS.filter(c => !c.isTreasure).map(c => c.id)
  );
  const [initialHp, setInitialHp] = useState(INITIAL_HP);
  const [initialHandSize, setInitialHandSize] = useState(3);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [p1SelectedCardId, setP1SelectedCardId] = useState<string | null>(null);
  const [p2SelectedCardId, setP2SelectedCardId] = useState<string | null>(null);
  
  // Debug & UI State
  const [showDebug, setShowDebug] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [viewingDiscardPid, setViewingDiscardPid] = useState<number | null>(null);

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
       isReversed: p?.isReversed
     };
  };

  // --- Initialization ---
  const initGame = () => {
      const allowedDefs = CARD_DEFINITIONS.filter(c => enabledCardIds.includes(c.id) || c.isTreasure);
      
      // Ensure we have enough cards to play, otherwise fallback to full deck
      const finalDefs = allowedDefs.length < 10 ? CARD_DEFINITIONS : allowedDefs;
      if (allowedDefs.length < 10) {
          console.warn("Selected deck too small, reverting to full deck.");
      }

      const p1Deck = shuffleDeck(generateDeck(1, finalDefs));
      const p2Deck = shuffleDeck(generateDeck(2, finalDefs));
      
      const p1Hand = p1Deck.splice(0, initialHandSize);
      const p2Hand = p2Deck.splice(0, initialHandSize);

      const initialPlayerState = (id: number, deck: Card[], hand: Card[]): PlayerState => ({
        id, name: `Player ${id}`, hp: initialHp, atk: INITIAL_ATK,
        deck, hand, discardPile: [],
        fieldSlot: null, isFieldCardRevealed: false,
        immunityThisTurn: false, immunityNextTurn: false, effectDoubleNext: false,
        isReversed: false, isInvalidated: false, hpRecoverNextTurn: 0, invalidateNextPlayedCard: false,
        preventHealing: false, hasLifesteal: false, damageReflection: false, incomingDamageConversion: false, nextDamageDouble: false,
        delayedEffects: [],
        maxHandSize: MAX_HAND_SIZE, skipDiscardThisTurn: false
      });

      setGameState({
        phase: GamePhase.DRAW,
        instantWindow: InstantWindow.NONE,
        turnCount: 1,
        logs: ["游戏开始。", `初始生命: ${initialHp}, 手牌: ${initialHandSize}`],
        player1: initialPlayerState(1, p1Deck, p1Hand),
        player2: initialPlayerState(2, p2Deck, p2Hand),
        isResolving: false,
        pendingEffects: [],
        activeEffect: null,
        interaction: null
      });
      setAppMode('GAME');
  };

  const handleSetupConfirm = (ids: string[], settings: { hp: number, handSize: number }) => {
      setEnabledCardIds(ids);
      setInitialHp(settings.hp);
      setInitialHandSize(settings.handSize);
      // Immediately start game after setup
      // Note: We need to use the new values, so we pass them to a modified init or update state and trigger effect?
      // Since setState is async, we can't call initGame immediately with state values. 
      // Instead, we update state and set a flag or just call a version of init that accepts params.
      // But for simplicity, we update state then let the user click "Start Game" on menu? 
      // No, "Confirm Start" implies starting.
      
      // Ugly hack for immediate start with new values:
      // We will duplicate the logic or update state and rely on a useEffect? No.
      // We will just return to menu? 
      // User flow: Menu -> Setup -> (Confirm) -> Menu (With new settings applied) -> Start Game.
      // Or Menu -> Setup -> (Confirm) -> Start Game immediately.
      // Let's do: Update State -> Switch to Menu. The user clicks Start Game on Menu.
      // This is safer.
      setAppMode('MENU');
  };

  // --- Rule: Empty Hand Check ---
  useEffect(() => {
    if (appMode !== 'GAME' || !gameState) return;
    const checkPlayer = (pid: number) => {
      const p = pid === 1 ? gameState.player1 : gameState.player2;
      if (p.hand.length === 0 && p.deck.length > 0) {
         const cardSource = p.deck[0];
         if (cardSource) {
            addLog(`[规则] ${p.name} 手牌耗尽，强制补牌。`);
            const ctx = createEffectContext(pid, cardSource);
            drawCards(ctx, pid, 1);
         }
      }
    };

    if (!gameState.isResolving && gameState.activeEffect === null && gameState.pendingEffects.length === 0 && gameState.interaction === null) {
        checkPlayer(1);
        checkPlayer(2);
    }
  }, [gameState?.player1.hand.length, gameState?.player2.hand.length, gameState?.isResolving, appMode]);

  // --- Rule: Lock Logic ---
  useEffect(() => {
      if (appMode !== 'GAME' || !gameState) return;

      const updateLocks = (p: PlayerState) => {
          const lovers = p.hand.filter(c => c.marks.includes('mark-lovers') || c.marks.includes('mark-swords-lovers'));
          const justice = p.hand.find(c => c.marks.includes('mark-justice'));
          const sun = p.hand.find(c => c.marks.includes('mark-sun'));
          
          const swordsLoversCount = p.hand.filter(c => c.marks.includes('mark-swords-lovers')).length;
          const hasWandsLoversPair = p.hand.filter(c => c.marks.includes('mark-lovers')).length >= 2;
          const hasJustice = !!justice;
          
          return p.hand.map(c => {
              if (c.isTreasure) return { ...c, isLocked: false }; 

              let shouldLock = false;
              if (hasWandsLoversPair && c.marks.includes('mark-lovers')) shouldLock = true;
              if (c.marks.includes('mark-swords-lovers') && swordsLoversCount >= 2) shouldLock = true;
              
              if (hasJustice && !c.marks.includes('mark-justice')) shouldLock = true;
              if (c.marks.includes('mark-sun')) shouldLock = true;

              if (c.isLocked !== shouldLock) {
                  return { ...c, isLocked: shouldLock };
              }
              return c;
          });
      };

      const newP1Hand = updateLocks(gameState.player1);
      const newP2Hand = updateLocks(gameState.player2);
      
      const p1Changed = JSON.stringify(newP1Hand) !== JSON.stringify(gameState.player1.hand);
      const p2Changed = JSON.stringify(newP2Hand) !== JSON.stringify(gameState.player2.hand);

      if (p1Changed || p2Changed) {
          setGameState(prev => {
              if (!prev) return null;
              return {
                  ...prev,
                  player1: p1Changed ? { ...prev.player1, hand: newP1Hand } : prev.player1,
                  player2: p2Changed ? { ...prev.player2, hand: newP2Hand } : prev.player2,
              };
          });
      }

  }, [gameState?.player1.hand, gameState?.player2.hand, appMode]);

  // --- Effect Queue Processor ---
  useEffect(() => {
    if (appMode !== 'GAME' || !gameState) return;
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
  }, [gameState?.pendingEffects, gameState?.activeEffect, gameState?.interaction, appMode]);

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

  // --- Visual Helper ---
  const triggerVisualEffect = async (type: PendingEffect['type'], card: Card, pid: number, desc?: string) => {
      return new Promise<void>((resolve) => {
          activeEffectResolverRef.current = resolve;
          setGameState(prev => {
              if (!prev) return null;
              return { ...prev, activeEffect: { type, card, playerId: pid, description: desc } };
          });
      });
  };

  // --- Phase Handlers ---
  const onDrawPhase = () => executeDrawPhase({ gameState, setGameState, createEffectContext });
  const onSetPhase = () => executeSetPhase({ setGameState, p1SelectedCardId, p2SelectedCardId, setP1SelectedCardId, setP2SelectedCardId });
  const onFlip = () => executeFlipCards({ gameState, setGameState, addLog, setP1SelectedCardId, setP2SelectedCardId });
  const onResolve = () => executeResolveEffects({ gameStateRef, setGameState, addLog, createEffectContext, triggerVisualEffect });
  const onDiscard = () => executeDiscardPhase({ gameState, setGameState, createEffectContext });

  // --- Interactions ---
  const handleCardClick = (player: PlayerState, card: Card) => {
    if (appMode !== 'GAME' || !gameState) return;
    if (gameState?.isResolving || gameState?.phase === GamePhase.GAME_OVER) return;

    if (gameState?.phase === GamePhase.SET) {
      if (player.id === 1) setP1SelectedCardId(card.instanceId === p1SelectedCardId ? null : card.instanceId);
      if (player.id === 2) setP2SelectedCardId(card.instanceId === p2SelectedCardId ? null : card.instanceId);
    } 
    else if (gameState?.instantWindow !== InstantWindow.NONE) {
       if (player.id === 1) setP1SelectedCardId(card.instanceId === p1SelectedCardId ? null : card.instanceId);
       if (player.id === 2) setP2SelectedCardId(card.instanceId === p2SelectedCardId ? null : card.instanceId);
    }
    else if (gameState?.phase === GamePhase.DISCARD) {
      if (card.isTreasure) {
          addLog(`[规则] 宝藏牌无法被弃置！`);
          return;
      }
      const handCount = player.hand.filter(c => !c.isTreasure).length;
      if (handCount > player.maxHandSize && !player.skipDiscardThisTurn) {
         const ctx = createEffectContext(player.id, card);
         discardCards(ctx, player.id, [card.instanceId]);
      }
    }
  };

  const handleInstantUse = async (player: PlayerState, cardInstanceId: string | null) => {
    if (!cardInstanceId || !gameState || gameState.isResolving) return;
    const card = player.hand.find(c => c.instanceId === cardInstanceId);
    if (!card || !card.onInstant) return;

    if (card.canInstant && !card.canInstant(gameState.instantWindow)) {
       addLog("当前时机无法使用此卡的插入效果。");
       return;
    }

    const oppId = getOpponentId(player.id);
    const opp = oppId === 1 ? gameState.player1 : gameState.player2;
    const moon = opp.hand.find(c => c.name.includes('月亮') && c.suit === 'WANDS'); 

    if (moon && !card.isTreasure) {
       setGameState(prev => {
           if(!prev) return null;
           return {
               ...prev,
               isResolving: true,
               interaction: {
                   id: `moon-interrupt-${Date.now()}`,
                   playerId: oppId,
                   title: "【月亮】被动触发",
                   description: `对手正在使用 [${card.name}]。是否发动 [${moon.name}] 进行无效？`,
                   options: [
                       {
                           label: "发动 (无效并销毁月亮)",
                           action: () => {
                               addLog(`[月亮] 触发！${opp.name} 无效了 [${card.name}] 并销毁了月亮！`);
                               const ctx = createEffectContext(oppId, moon);
                               destroyCard(ctx, moon.instanceId);
                               setGameState(cur => cur ? ({ ...cur, isResolving: false, interaction: null }) : null);
                           }
                       },
                       {
                           label: "不发动",
                           action: () => {
                               setGameState(cur => cur ? ({ ...cur, interaction: null }) : null);
                               proceedInstant(player, card);
                           }
                       }
                   ]
               }
           }
       });
       return;
    }

    proceedInstant(player, card);
  };

  const proceedInstant = async (player: PlayerState, card: Card) => {
      setGameState(prev => prev ? ({ ...prev, isResolving: true }) : null);
      await triggerVisualEffect('INSTANT', card, player.id, "发动插入特效！");
      card.onInstant && card.onInstant(createEffectContext(player.id, card));
      
      setGameState(prev => {
          if (!prev) return null;
          const key = player.id === 1 ? 'player1' : 'player2';
          const p = prev[key];
          const stillInHand = p.hand.find(c => c.instanceId === card.instanceId);
          if (stillInHand) {
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

      if (player.id === 1) setP1SelectedCardId(null);
      if (player.id === 2) setP2SelectedCardId(null);
  };

  // --- RENDER SWITCH ---
  if (appMode === 'MENU') {
      return <StartScreen onStartGame={initGame} onOpenDeckBuilder={() => setAppMode('BUILDER')} />;
  }

  if (appMode === 'BUILDER') {
      return (
        <GameSetupScreen 
            enabledCardIds={enabledCardIds} 
            initialSettings={{ hp: initialHp, handSize: initialHandSize }}
            onSave={handleSetupConfirm} 
            onBack={() => setAppMode('MENU')} 
        />
      );
  }

  // --- GAME RENDER ---
  if (!gameState) return <div className="bg-stone-900 h-screen text-stone-400 flex items-center justify-center font-serif">Initializing...</div>;

  const { phase, instantWindow, player1, player2, isResolving, activeEffect, interaction } = gameState;
  
  const p1Sel = player1.hand.find(c => c.instanceId === p1SelectedCardId);
  const p2Sel = player2.hand.find(c => c.instanceId === p2SelectedCardId);
  const canSetP1 = player1.hand.length > 0 ? (p1Sel && p1Sel.canSet !== false && !p1Sel.isLocked) : true;
  const canSetP2 = player2.hand.length > 0 ? (p2Sel && p2Sel.canSet !== false && !p2Sel.isLocked) : true;
  const canInstantP1 = p1Sel && p1Sel.canInstant?.(instantWindow);
  const canInstantP2 = p2Sel && p2Sel.canInstant?.(instantWindow);
  
  const p1HandCount = player1.hand.filter(c => !c.isTreasure).length;
  const p2HandCount = player2.hand.filter(c => !c.isTreasure).length;
  const p1MustDiscard = p1HandCount > player1.maxHandSize && !player1.skipDiscardThisTurn;
  const p2MustDiscard = p2HandCount > player2.maxHandSize && !player2.skipDiscardThisTurn;

  const getActionButton = () => {
    if (phase === GamePhase.GAME_OVER) {
        return <div className="text-2xl font-black text-red-600 animate-pulse font-serif">游戏结束</div>;
    }
    const commonClasses = "w-full py-3 rounded-lg font-serif font-black text-lg tracking-widest shadow-md transition-all transform duration-200 border-b-4 active:border-b-0 active:translate-y-1";
    
    if (phase === GamePhase.DRAW) return <button onClick={onDrawPhase} className={`${commonClasses} bg-stone-700 hover:bg-stone-600 hover:shadow-stone-500/20 text-stone-200 border-stone-900`}>抽牌阶段</button>;
    if (phase === GamePhase.SET) {
       const disabled = !canSetP1 || !canSetP2;
       return <button onClick={onSetPhase} disabled={disabled} className={`${commonClasses} ${disabled ? 'bg-stone-800 border-stone-900 text-stone-600 cursor-not-allowed' : 'bg-emerald-800 hover:bg-emerald-700 text-emerald-100 border-emerald-950 shadow-emerald-900/30'}`}>确认盖牌</button>;
    }
    if (phase === GamePhase.REVEAL) {
       if (instantWindow === InstantWindow.BEFORE_REVEAL) return <button onClick={onFlip} className={`${commonClasses} bg-amber-800 hover:bg-amber-700 text-amber-100 border-amber-950 shadow-amber-900/30`}>揭示卡牌</button>;
       if (instantWindow === InstantWindow.AFTER_REVEAL) return <button onClick={onResolve} className={`${commonClasses} bg-indigo-900 hover:bg-indigo-800 text-indigo-100 border-black shadow-indigo-900/30`}>结算效果</button>;
       return <button className={`${commonClasses} bg-stone-800 text-stone-500 border-stone-950`} disabled>结算中...</button>;
    }
    if (phase === GamePhase.DISCARD) {
       const disabled = p1MustDiscard || p2MustDiscard;
       return <button onClick={onDiscard} disabled={disabled} className={`${commonClasses} ${disabled ? 'bg-stone-800 text-red-400 border-stone-950' : 'bg-stone-700 hover:bg-stone-600 text-stone-200 border-stone-900'}`}>{disabled ? "请先弃牌" : "结束回合"}</button>;
    }
    return null;
  };

  const viewingDiscardPlayer = viewingDiscardPid === 1 ? player1 : viewingDiscardPid === 2 ? player2 : null;

  return (
    <div className="min-h-screen bg-stone-900 flex flex-col font-sans text-stone-300 overflow-hidden selection:bg-amber-900/50 relative">
      
      {/* Unified Background */}
      <div className="absolute inset-0 bg-stone-900 z-0"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(28,25,23,0)_0%,_rgba(0,0,0,0.5)_100%)] z-0 pointer-events-none"></div>
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] z-0"></div>
      
      {/* Top Bar */}
      <div className="absolute top-4 right-4 z-50 flex gap-3">
         <button 
           onClick={() => setAppMode('MENU')} 
           className="text-[10px] bg-stone-900/60 text-red-400 hover:text-red-300 px-3 py-2 rounded border border-red-900/30 backdrop-blur"
         >
           退出游戏
         </button>
         <button 
           onClick={() => setShowGallery(!showGallery)} 
           className="text-[10px] font-serif font-bold bg-stone-900/60 text-amber-600 hover:text-amber-500 px-4 py-2 rounded border border-amber-900/30 backdrop-blur transition-all hover:shadow-[0_0_15px_rgba(180,83,9,0.2)]"
         >
           📖 卡牌图鉴
         </button>
         <button 
           onClick={() => setShowDebug(!showDebug)} 
           className="text-[10px] bg-stone-900/60 text-stone-600 hover:text-stone-400 px-3 py-2 rounded border border-stone-800 backdrop-blur"
         >
           调试
         </button>
      </div>

      {showGallery && <GalleryOverlay onClose={() => setShowGallery(false)} />}
      
      {viewingDiscardPlayer && <DiscardOverlay player={viewingDiscardPlayer} onClose={() => setViewingDiscardPid(null)} />}

      {showDebug && (
          <DebugOverlay 
             gameState={gameState} 
             setGameState={setGameState} 
             createEffectContext={createEffectContext} 
             onClose={() => setShowDebug(false)} 
          />
      )}

      {phase === GamePhase.GAME_OVER && <GameOverOverlay result={gameState.logs[0]} onRestart={() => setAppMode('MENU')} />}
      {activeEffect && <EffectOverlay effect={activeEffect} onDismiss={dismissActiveEffect} />}
      {interaction && <InteractionOverlay request={interaction} />}

      <PhaseBar currentPhase={phase} turn={gameState.turnCount} />
      
      {/* Status Ticker */}
      <div className="bg-stone-900/80 backdrop-blur text-center text-[10px] py-1.5 border-b border-stone-800/50 shadow-lg relative z-30">
         <span className="text-amber-700 font-bold tracking-wider uppercase mr-2">状态:</span>
         <span className="text-stone-400 font-serif">
            {instantWindow === InstantWindow.NONE ? '等待中...' : 
             instantWindow === InstantWindow.BEFORE_SET ? '置牌前时机' :
             instantWindow === InstantWindow.BEFORE_REVEAL ? '亮牌前时机' :
             instantWindow === InstantWindow.AFTER_REVEAL ? '亮牌后时机' : '结算中...'}
         </span>
      </div>

      {isResolving && !activeEffect && !interaction && (
         <div className="absolute inset-0 z-[45] flex items-center justify-center pointer-events-none">
            <div className="bg-black/70 text-amber-500 px-8 py-4 rounded-xl text-lg font-serif font-bold shadow-2xl backdrop-blur-md border border-amber-900/30 animate-pulse">
               处理中...
            </div>
         </div>
      )}

      <div className="flex-grow flex flex-col relative overflow-hidden z-10">
        <PlayerArea 
          player={player2} isOpponent phase={phase} 
          selectedCardId={p2SelectedCardId} mustDiscard={p2MustDiscard}
          canSet={canSetP2} canInstant={!!canInstantP2} isResolving={isResolving} instantWindow={instantWindow}
          onSelect={(c) => handleCardClick(player2, c)} onInstant={(id) => handleInstantUse(player2, id)}
          onViewDiscard={() => setViewingDiscardPid(2)}
        />
        
        <FieldArea player1={player1} player2={player2} />

        <PlayerArea 
          player={player1} phase={phase} 
          selectedCardId={p1SelectedCardId} mustDiscard={p1MustDiscard}
          canSet={canSetP1} canInstant={!!canInstantP1} isResolving={isResolving} instantWindow={instantWindow}
          onSelect={(c) => handleCardClick(player1, c)} onInstant={(id) => handleInstantUse(player1, id)}
          onViewDiscard={() => setViewingDiscardPid(1)}
        />
      </div>

      {/* Bottom Action Panel */}
      <div className="bg-stone-900/80 backdrop-blur-md border-t border-stone-800/50 p-4 flex gap-6 h-40 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-30 relative">
         <div className="w-1/3 max-w-xs flex flex-col items-center justify-center border-r border-stone-800/50 pr-4">
            {getActionButton()}
         </div>
         <div className="w-2/3 flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-stone-700 font-mono text-[10px] space-y-1 pl-2 mask-image-gradient-b">
            {gameState.logs.map((log, i) => (
               <div key={i} className="border-b border-stone-800/30 pb-0.5 text-stone-400 hover:text-stone-200 transition-colors">
                  <span className="text-stone-600 mr-2">[{String(gameState.logs.length - i).padStart(3, '0')}]</span>
                  {log}
               </div>
            ))}
         </div>
      </div>
    </div>
  );
}