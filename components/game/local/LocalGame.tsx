
import React, { useState, useEffect, useRef } from 'react';
import { GameState, GamePhase, InstantWindow, Card, PlayerState, EffectContext, VisualEvent, PendingEffect } from '../../../types';
import { generateDeck, shuffleDeck } from '../../../services/gameUtils';
import { INITIAL_ATK } from '../../../constants';
import { CARD_DEFINITIONS } from '../../../data/cards';
import { PhaseBar } from '../../PhaseBar';
import { PlayerArea } from '../../PlayerArea';
import { FieldArea } from '../../FieldArea';
import { GameLogSidebar } from '../../GameLogSidebar';
import { InteractionOverlay, EffectOverlay, GameOverOverlay, CardPileOverlay, GalleryOverlay, DebugOverlay } from '../../overlays';
import { VisualEffectsLayer } from '../../VisualEffectsLayer';

import { executeDrawPhase } from '../../../logic/phases/draw';
import { executeSetPhase } from '../../../logic/phases/set';
import { executeFlipCards, executeResolveEffects } from '../../../logic/phases/reveal';
import { executeDiscardPhase } from '../../../logic/phases/discard';
import { drawCards, discardCards } from '../../../services/actions';

interface LocalGameProps {
  enabledCardIds: string[];
  initialHp: number;
  initialHandSize: number;
  onExit: () => void;
}

export const LocalGame: React.FC<LocalGameProps> = ({ enabledCardIds, initialHp, initialHandSize, onExit }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // Selection & UI State
  const [p1SelectedCardId, setP1SelectedCardId] = useState<string | null>(null);
  const [p2SelectedCardId, setP2SelectedCardId] = useState<string | null>(null);
  
  const [showDeckP1, setShowDeckP1] = useState(false);
  const [showDeckP2, setShowDeckP2] = useState(false);
  const [showDiscardP1, setShowDiscardP1] = useState(false);
  const [showDiscardP2, setShowDiscardP2] = useState(false);
  const [showVault, setShowVault] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  // Helper: Create Context for Actions
  const createEffectContext = (pid: number, card: Card): EffectContext => ({
      gameState: gameStateRef.current!, 
      sourcePlayerId: pid,
      card,
      setGameState,
      log: (msg) => setGameState(prev => prev ? ({ ...prev, logs: [msg, ...prev.logs] }) : null),
      gameMode: 'LOCAL'
  });
  
  const addLog = (msg: string) => {
      setGameState(prev => prev ? ({ ...prev, logs: [msg, ...prev.logs] }) : null);
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    const definitions = CARD_DEFINITIONS.filter(c => enabledCardIds.includes(c.id));
    
    const p1Deck = shuffleDeck(generateDeck(1, definitions));
    const p2Deck = shuffleDeck(generateDeck(2, definitions));

    const p1Hand = p1Deck.splice(0, initialHandSize);
    const p2Hand = p2Deck.splice(0, initialHandSize);

    const initialPlayer: Omit<PlayerState, 'id' | 'name' | 'deck' | 'hand'> = {
        hp: initialHp,
        atk: INITIAL_ATK,
        discardPile: [],
        fieldSlot: null,
        isFieldCardRevealed: false,
        immunityThisTurn: false,
        immunityNextTurn: false,
        effectDoubleNext: false,
        isReversed: false,
        isInvalidated: false,
        hpRecoverNextTurn: 0,
        invalidateNextPlayedCard: false,
        invalidateNextTurn: false,
        preventTransform: 0,
        preventHealing: false,
        hasLifesteal: false,
        damageReflection: false,
        incomingDamageConversion: false,
        nextDamageDouble: false,
        swordsHangedManActive: false,
        damageTakenThisTurn: 0,
        piercingDamageThisTurn: false,
        piercingDamageNextTurn: false,
        delayedEffects: [],
        maxHandSize: initialHandSize + 3, // Basic rule? Or default
        skipDiscardThisTurn: false,
        quests: [],
        swordsSunDamageMult: 1
    };

    const newState: GameState = {
        phase: GamePhase.DRAW,
        instantWindow: InstantWindow.NONE,
        turnCount: 1,
        player1: { id: 1, name: "Player 1", ...initialPlayer, deck: p1Deck, hand: p1Hand },
        player2: { id: 2, name: "Player 2", ...initialPlayer, deck: p2Deck, hand: p2Hand },
        playerReadyState: { 1: false, 2: false },
        field: null,
        logs: ["游戏开始！"],
        isResolving: false,
        pendingEffects: [],
        activeEffect: null,
        interaction: null,
        visualEvents: []
    };

    setGameState(newState);
    
    // Trigger start of game Draw Phase after a short delay
    setTimeout(() => {
        executeDrawPhase({ 
            gameState: newState, 
            setGameState, 
            createEffectContext: (pid, c) => ({ 
                gameState: newState, sourcePlayerId: pid, card: c, setGameState, log: () => {}, gameMode: 'LOCAL' 
            }) 
        });
    }, 1000);
  }, []); // Run once on mount

  // --- PHASE ADVANCEMENT ---
  const advancePhase = async () => {
      if (!gameState || gameState.isResolving) return;

      if (gameState.phase === GamePhase.SET) {
          // Check if both players selected a card (or have no cards)
          const p1Ready = gameState.player1.fieldSlot !== null || gameState.player1.hand.length === 0;
          const p2Ready = gameState.player2.fieldSlot !== null || gameState.player2.hand.length === 0;
          
          if (p1Ready && p2Ready) {
              await executeFlipCards({ gameState, setGameState, addLog });
              setTimeout(() => executeResolveEffects({ 
                  gameStateRef, 
                  setGameState, 
                  addLog, 
                  createEffectContext,
                  triggerVisualEffect: async () => {} // No explicit visual trigger needed for auto resolve here
              }), 1000);
          }
      } else if (gameState.phase === GamePhase.REVEAL) {
          // Usually auto-advances in executeResolveEffects, but if stuck, this button might force Discard Phase?
          // Actually Reveal -> Discard is automatic.
      } else if (gameState.phase === GamePhase.DISCARD) {
          executeDiscardPhase({ gameState, setGameState, createEffectContext });
      } else if (gameState.phase === GamePhase.DRAW) {
          // Usually automatic or triggered by effect completion.
          // But if we are stuck in Draw, we can force Set.
          // executeDrawPhase handles transition to SET.
      }
  };

  // --- ACTIONS ---
  const handleCardSelect = (pid: number, card: Card) => {
      if (!gameState) return;
      if (gameState.phase === GamePhase.SET) {
          if (pid === 1) setP1SelectedCardId(card.instanceId);
          else setP2SelectedCardId(card.instanceId);
      } else {
          // For Instants or Discard, just select visuals?
          if (pid === 1) setP1SelectedCardId(card.instanceId);
          else setP2SelectedCardId(card.instanceId);
      }
  };

  const handleSetConfirm = (pid: number) => {
      if (!gameState) return;
      // In Local, we wait for both to click "Confirm" ideally, or just Set immediately if it's hotseat.
      // For simultaneous feel, let's use ready state.
      setGameState(prev => {
          if (!prev) return null;
          return {
              ...prev,
              playerReadyState: { ...prev.playerReadyState, [pid]: true }
          };
      });
  };

  // Trigger Set Phase Execution when both ready
  useEffect(() => {
      if (gameState?.phase === GamePhase.SET && gameState.playerReadyState[1] && gameState.playerReadyState[2]) {
          executeSetPhase({ 
              setGameState, 
              p1SelectedCardId, 
              p2SelectedCardId 
          });
          // Reset selection
          setP1SelectedCardId(null);
          setP2SelectedCardId(null);
      }
  }, [gameState?.playerReadyState, gameState?.phase]);


  const handleInstantUse = (pid: number, cardId: string) => {
      if (!gameState) return;
      const p = pid === 1 ? gameState.player1 : gameState.player2;
      const card = p.hand.find(c => c.instanceId === cardId);
      
      if (card && card.onInstant) {
          const ctx = createEffectContext(pid, card);
          addLog(`${p.name} 使用了插入：[${card.name}]`);
          
          // Trigger Instant Logic
          card.onInstant(ctx);
          
          // Discard the card used
          discardCards(ctx, pid, [card.instanceId]);
          
          // Clear selection
          if(pid === 1) setP1SelectedCardId(null);
          else setP2SelectedCardId(null);
      }
  };

  // --- VISUAL EVENTS CLEANUP ---
  const handleVisualEventComplete = (id: string) => {
      setGameState(prev => {
          if (!prev) return null;
          return {
              ...prev,
              visualEvents: prev.visualEvents.filter(e => e.id !== id)
          };
      });
  };

  // --- RULES: Empty Hand / All Locked ---
  useEffect(() => {
    if (!gameState) return;
    const checkPlayer = (pid: number) => {
      const p = pid === 1 ? gameState.player1 : gameState.player2;
      
      const isHandEmpty = p.hand.length === 0;
      const isAllLocked = p.hand.length > 0 && p.hand.every(c => c.isLocked);

      if ((isHandEmpty || isAllLocked) && p.deck.length > 0) {
         const cardSource = p.deck[0];
         if (cardSource) {
            // Only trigger if NOT resolving to avoid loops
            if (!gameState.isResolving) {
                 addLog(`[规则] ${p.name} 手牌耗尽或全被锁定，强制补牌。`);
                 const ctx = createEffectContext(pid, cardSource);
                 drawCards(ctx, pid, 1);
            }
         }
      }
    };

    if (gameState.phase !== GamePhase.GAME_OVER) {
        checkPlayer(1);
        checkPlayer(2);
    }
  }, [gameState?.player1.hand.length, gameState?.player2.hand.length, gameState?.phase]);

  // --- EFFECT QUEUE PROCESSING ---
  useEffect(() => {
      if (!gameState || gameState.activeEffect || gameState.pendingEffects.length === 0) return;
      
      const nextEffect = gameState.pendingEffects[0];
      setGameState(prev => {
          if(!prev) return null;
          return {
              ...prev,
              activeEffect: nextEffect,
              pendingEffects: prev.pendingEffects.slice(1)
          };
      });
  }, [gameState?.pendingEffects, gameState?.activeEffect]);


  if (!gameState) return <div className="text-white text-center mt-20">Loading...</div>;

  return (
    <div className="relative w-full h-screen bg-stone-950 overflow-hidden flex flex-col font-sans select-none">
        
        {/* Backgrounds */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-stone-900/40 to-black/80 pointer-events-none"></div>

        {/* Phase Bar */}
        <PhaseBar currentPhase={gameState.phase} turn={gameState.turnCount} />

        {/* Game Area */}
        <div className="flex-1 flex overflow-hidden relative">
            {/* Left Sidebar: Logs */}
            <GameLogSidebar logs={gameState.logs} currentPlayerId={null} />

            {/* Main Board */}
            <div className="flex-1 flex flex-col relative">
                
                {/* Visual Effects */}
                <VisualEffectsLayer events={gameState.visualEvents} onEventComplete={handleVisualEventComplete} />

                {/* Player 2 (Opponent) Area */}
                <PlayerArea 
                    player={gameState.player2} 
                    isOpponent={true} 
                    phase={gameState.phase}
                    selectedCardId={p2SelectedCardId}
                    mustDiscard={gameState.phase === GamePhase.DISCARD && gameState.player2.hand.length > gameState.player2.maxHandSize}
                    canSet={gameState.phase === GamePhase.SET && !gameState.playerReadyState[2]}
                    canInstant={gameState.instantWindow !== InstantWindow.NONE}
                    isResolving={gameState.isResolving}
                    instantWindow={gameState.instantWindow}
                    onSelect={(c) => handleCardSelect(2, c)}
                    onInstant={(id) => handleInstantUse(2, id)}
                    onViewDiscard={() => setShowDiscardP2(true)}
                    onViewDeck={() => setShowDeckP2(true)}
                    onViewVault={() => setShowVault(true)}
                    enableControls={true} // Local Game: P2 has controls
                />

                {/* Set Confirmation Button for P2 */}
                {gameState.phase === GamePhase.SET && !gameState.playerReadyState[2] && (
                     <div className="absolute top-[28%] right-20 z-50">
                         <button 
                            disabled={!p2SelectedCardId && gameState.player2.hand.length > 0}
                            onClick={() => handleSetConfirm(2)}
                            className="bg-emerald-700 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                            P2 确认盖牌
                         </button>
                     </div>
                )}

                {/* Field Area */}
                <FieldArea gameState={gameState} player1={gameState.player1} player2={gameState.player2} />

                {/* Reveal / Phase Button (Center) */}
                {gameState.phase === GamePhase.REVEAL && gameState.instantWindow === InstantWindow.BEFORE_REVEAL && !gameState.isResolving && (
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
                          <button 
                            onClick={advancePhase}
                            className="bg-amber-600 hover:bg-amber-500 text-white text-xl px-8 py-3 rounded-full font-serif font-bold shadow-[0_0_30px_rgba(245,158,11,0.5)] animate-pulse"
                          >
                             ⚔️ 揭示卡牌 ⚔️
                          </button>
                     </div>
                )}
                 
                 {/* Discard Phase Confirm Button */}
                 {gameState.phase === GamePhase.DISCARD && (
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
                         <button 
                            onClick={advancePhase}
                            className="bg-stone-700 hover:bg-stone-600 text-stone-200 px-6 py-2 rounded-full font-bold shadow-lg border border-stone-500"
                         >
                            {gameState.player1.hand.length > gameState.player1.maxHandSize || gameState.player2.hand.length > gameState.player2.maxHandSize 
                                ? "等待弃牌..." 
                                : "结束回合 ▶"}
                         </button>
                     </div>
                 )}

                {/* Player 1 Area */}
                <PlayerArea 
                    player={gameState.player1} 
                    isOpponent={false} 
                    phase={gameState.phase}
                    selectedCardId={p1SelectedCardId}
                    mustDiscard={gameState.phase === GamePhase.DISCARD && gameState.player1.hand.length > gameState.player1.maxHandSize}
                    canSet={gameState.phase === GamePhase.SET && !gameState.playerReadyState[1]}
                    canInstant={gameState.instantWindow !== InstantWindow.NONE}
                    isResolving={gameState.isResolving}
                    instantWindow={gameState.instantWindow}
                    onSelect={(c) => handleCardSelect(1, c)}
                    onInstant={(id) => handleInstantUse(1, id)}
                    onViewDiscard={() => setShowDiscardP1(true)}
                    onViewDeck={() => setShowDeckP1(true)}
                    onViewVault={() => setShowVault(true)}
                    enableControls={true}
                />

                {/* Set Confirmation Button for P1 */}
                {gameState.phase === GamePhase.SET && !gameState.playerReadyState[1] && (
                     <div className="absolute bottom-[28%] left-20 z-50">
                         <button 
                            disabled={!p1SelectedCardId && gameState.player1.hand.length > 0}
                            onClick={() => handleSetConfirm(1)}
                            className="bg-emerald-700 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                            P1 确认盖牌
                         </button>
                     </div>
                )}
            </div>
        </div>

        {/* --- OVERLAYS --- */}
        
        {/* Interaction (Choice) Overlay */}
        {gameState.interaction && (
            <InteractionOverlay request={gameState.interaction} />
        )}

        {/* Effect Resolution Overlay */}
        {gameState.activeEffect && (
            <EffectOverlay 
                effect={gameState.activeEffect} 
                onDismiss={() => setGameState(prev => prev ? ({ ...prev, activeEffect: null }) : null)} 
            />
        )}

        {/* Game Over Overlay */}
        {gameState.phase === GamePhase.GAME_OVER && (
            <GameOverOverlay 
                result={gameState.logs[0]} 
                onRestart={onExit}
            />
        )}

        {/* Pile Overlays */}
        {showDeckP1 && <CardPileOverlay title="Player 1 抽牌堆" cards={gameState.player1.deck} sorted onClose={() => setShowDeckP1(false)} />}
        {showDeckP2 && <CardPileOverlay title="Player 2 抽牌堆" cards={gameState.player2.deck} sorted onClose={() => setShowDeckP2(false)} />}
        {showDiscardP1 && <CardPileOverlay title="Player 1 弃牌堆" cards={gameState.player1.discardPile} onClose={() => setShowDiscardP1(false)} />}
        {showDiscardP2 && <CardPileOverlay title="Player 2 弃牌堆" cards={gameState.player2.discardPile} onClose={() => setShowDiscardP2(false)} />}
        {showVault && (
             <CardPileOverlay 
                title="宝库 (Treasures)" 
                cards={CARD_DEFINITIONS.filter(c => c.isTreasure).map(d => ({...d, instanceId: d.id, marks: [], description: d.description || ""}))} 
                onClose={() => setShowVault(false)} 
             />
        )}

        {/* Tools */}
        <div className="absolute bottom-2 right-2 flex gap-2 z-50">
             <button onClick={() => setShowGallery(true)} className="bg-stone-800 text-stone-400 p-2 rounded-full hover:bg-stone-700">📚</button>
             <button onClick={() => setShowDebug(true)} className="bg-stone-800 text-stone-400 p-2 rounded-full hover:bg-stone-700">🐛</button>
        </div>

        {showGallery && <GalleryOverlay onClose={() => setShowGallery(false)} />}
        {showDebug && (
            <DebugOverlay 
                gameState={gameState} 
                setGameState={setGameState} 
                createEffectContext={createEffectContext}
                onClose={() => setShowDebug(false)} 
            />
        )}
    </div>
  );
};
