
import React, { useState, useEffect, useRef, useMemo } from 'react';
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

// Import local AI Logic
import { calculateCardUtilityDetailed } from './aiLogic';
import { handleAIInteraction } from './aiDecisions';

interface AdventureGameProps {
    enabledCardIds: string[];
    initialHp: number;
    initialHandSize: number;
    onExit: () => void;
}

export const AdventureGame: React.FC<AdventureGameProps> = ({ enabledCardIds, initialHp, initialHandSize, onExit }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [p1SelectedCardId, setP1SelectedCardId] = useState<string | null>(null);
  const [p2SelectedCardId, setP2SelectedCardId] = useState<string | null>(null);
  
  const [showDebug, setShowDebug] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [revealAIHand, setRevealAIHand] = useState(false); 
  const [showAIScores, setShowAIScores] = useState(false); 
  
  const [viewingPile, setViewingPile] = useState<{ type: 'DISCARD' | 'DECK' | 'VAULT', pid: number, cards: Card[], title: string, sorted?: boolean } | null>(null);
  const activeEffectResolverRef = useRef<(() => void) | null>(null);
  const gameStateRef = useRef<GameState | null>(null);
  
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  const addLog = (message: string) => {
    setGameState(prev => prev ? ({ ...prev, logs: [message, ...prev.logs] }) : null);
  };

  const createEffectContext = (playerId: number, card: Card): EffectContext => {
     const p = (playerId === 1 ? gameStateRef.current?.player1 : gameStateRef.current?.player2) || gameStateRef.current?.player1!; 
     return { gameState: gameStateRef.current!, sourcePlayerId: playerId, card, setGameState, log: addLog, isReversed: p?.isReversed, gameMode: 'LOCAL' };
  };

  // FIX: Moved triggerVisualEffect and dismissActiveEffect up to avoid initialization errors
  const triggerVisualEffect = async (type: PendingEffect['type'], card: Card, pid: number, desc?: string) => {
      return new Promise<void>((resolve) => {
          activeEffectResolverRef.current = resolve;
          setGameState(prev => {
              if (!prev) return null;
              return { ...prev, activeEffect: { type, card, playerId: pid, description: desc } };
          });
      });
  };

  const dismissActiveEffect = () => {
     if (gameStateRef.current?.activeEffect) {
         const effect = gameStateRef.current.activeEffect;
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

  const aiDebugInfo = useMemo(() => {
      if (!showAIScores || !gameState) return undefined;
      const info: Record<string, { score: number, reasons: string[] }> = {};
      gameState.player2.hand.forEach(c => {
          const util = calculateCardUtilityDetailed(c, gameState.player2, gameState.player1, gameState);
          info[c.instanceId] = util;
      });
      return info;
  }, [showAIScores, gameState]);

  useEffect(() => {
      const allowedDefs = CARD_DEFINITIONS.filter(c => enabledCardIds.includes(c.id) || c.isTreasure);
      const finalDefs = allowedDefs.length < 10 ? CARD_DEFINITIONS : allowedDefs;
      const p1Deck = shuffleDeck(generateDeck(1, finalDefs));
      const p2Deck = shuffleDeck(generateDeck(2, finalDefs));
      const p1Hand = p1Deck.splice(0, initialHandSize);
      const p2Hand = p2Deck.splice(0, initialHandSize);
      const initialPlayerState = (id: number, deck: Card[], hand: Card[]): PlayerState => ({
        id, name: id === 1 ? "玩家" : "冒险宿敌", hp: initialHp, atk: INITIAL_ATK,
        deck, hand, discardPile: [], fieldSlot: null, isFieldCardRevealed: false,
        immunityThisTurn: false, immunityNextTurn: false, effectDoubleNext: false,
        isReversed: false, isInvalidated: false, hpRecoverNextTurn: 0, invalidateNextPlayedCard: false, invalidateNextTurn: false,
        preventTransform: 0, preventHealing: false, hasLifesteal: false, damageReflection: false, incomingDamageConversion: false, nextDamageDouble: false,
        swordsHangedManActive: false, damageTakenThisTurn: 0, piercingDamageThisTurn: false, piercingDamageNextTurn: false,
        delayedEffects: [], maxHandSize: MAX_HAND_SIZE, skipDiscardThisTurn: false, quests: [], swordsSunDamageMult: 1, 
      });
      setGameState({
        phase: GamePhase.DRAW, instantWindow: InstantWindow.NONE, turnCount: 1, logs: ["冒险模式：序章开始。"],
        player1: initialPlayerState(1, p1Deck, p1Hand), player2: initialPlayerState(2, p2Deck, p2Hand),
        playerReadyState: { 1: false, 2: false }, field: null, isResolving: false, pendingEffects: [], activeEffect: null, interaction: null, visualEvents: []
      });
  }, [enabledCardIds, initialHp, initialHandSize]);

  useEffect(() => {
      if (!gameState) return;
      const { phase, player2, player1, interaction } = gameState;
      if (interaction && interaction.playerId === 2) {
          const timer = setTimeout(() => { handleAIInteraction(interaction, gameState, setGameState); }, 1000);
          return () => clearTimeout(timer);
      }
      if (phase === GamePhase.SET && !p2SelectedCardId && !interaction) {
          const timer = setTimeout(() => {
              const hand = player2.hand;
              const validCards = hand.filter(c => !c.isLocked && c.canSet !== false);
              if (validCards.length > 0) {
                  const scoredCards = validCards.map(c => ({ card: c, score: calculateCardUtilityDetailed(c, player2, player1, gameState).score + Math.random() * 5 }));
                  scoredCards.sort((a, b) => b.score - a.score);
                  setP2SelectedCardId(scoredCards[0].card.instanceId);
              }
          }, 1500); 
          return () => clearTimeout(timer);
      }
      if (phase === GamePhase.DISCARD && !interaction) {
          const hand = player2.hand.filter(c => !c.isTreasure);
          if (hand.length > player2.maxHandSize && !player2.skipDiscardThisTurn) {
               const timer = setTimeout(() => {
                   const scoredCards = hand.map(c => ({ card: c, score: calculateCardUtilityDetailed(c, player2, player1, gameState).score + Math.random() * 3 }));
                   scoredCards.sort((a, b) => a.score - b.score);
                   const toDiscard = scoredCards[0].card;
                   discardCards(createEffectContext(2, toDiscard), 2, [toDiscard.instanceId]);
               }, 1000);
               return () => clearTimeout(timer);
          }
      }
  }, [gameState]);

  const onDrawPhase = () => executeDrawPhase({ gameState, setGameState, createEffectContext });
  const onSetPhase = () => { executeSetPhase({ setGameState, p1SelectedCardId, p2SelectedCardId }); setP1SelectedCardId(null); setP2SelectedCardId(null); };
  const onFlip = () => { executeFlipCards({ gameState, setGameState, addLog }); setP1SelectedCardId(null); setP2SelectedCardId(null); };
  const onResolve = () => executeResolveEffects({ gameStateRef, setGameState, addLog, createEffectContext, triggerVisualEffect });
  const onDiscard = () => executeDiscardPhase({ gameState, setGameState, createEffectContext });

  const handleCardClick = (player: PlayerState, card: Card) => {
    if (!gameState || gameState.isResolving || gameState.phase === GamePhase.GAME_OVER) return;
    if (gameState.phase === GamePhase.SET || gameState.instantWindow !== InstantWindow.NONE) {
      if (player.id === 1) setP1SelectedCardId(card.instanceId === p1SelectedCardId ? null : card.instanceId);
    } 
    else if (gameState.phase === GamePhase.DISCARD) {
      if (card.isTreasure) return;
      // 修改：限制玩家手牌至少留一张
      if (player.hand.length < 2) { addLog("[规则] 至少需要保留一张手牌。"); return; }
      discardCards(createEffectContext(player.id, card), player.id, [card.instanceId]);
    }
  };

  const { phase, instantWindow, player1, player2, isResolving, activeEffect, interaction } = gameState || {} as GameState;
  const p1HandCount = player1?.hand.filter(c => !c.isTreasure).length || 0;
  const p1MustDiscard = p1HandCount > (player1?.maxHandSize || 3) && !player1?.skipDiscardThisTurn;

  const getActionButton = () => {
    if (phase === GamePhase.GAME_OVER) return <div className="text-2xl font-black text-red-600 animate-pulse font-serif">冒险结束</div>;
    const commonClasses = "w-full py-3 rounded-lg font-serif font-black text-lg tracking-widest shadow-md transition-all transform duration-200 border-b-4 active:border-b-0 active:translate-y-1";
    if (phase === GamePhase.DRAW) return <button onClick={onDrawPhase} className={`${commonClasses} bg-stone-700 hover:bg-stone-600 text-stone-200 border-stone-900`}>抽牌阶段</button>;
    if (phase === GamePhase.SET) return <button onClick={onSetPhase} disabled={!p1SelectedCardId || !p2SelectedCardId} className={`${commonClasses} ${(!p1SelectedCardId || !p2SelectedCardId) ? 'bg-stone-800' : 'bg-emerald-800'}`}>确认盖牌</button>;
    if (phase === GamePhase.REVEAL) return <button onClick={instantWindow === InstantWindow.BEFORE_REVEAL ? onFlip : onResolve} className={`${commonClasses} bg-amber-800`}>继续</button>;
    if (phase === GamePhase.DISCARD) {
       // 修改：手牌 <= 3 即可点结束
       return <button onClick={onDiscard} disabled={p1MustDiscard} className={`${commonClasses} ${p1MustDiscard ? 'bg-stone-800 text-red-400' : 'bg-stone-700'}`}>{p1MustDiscard ? "请先弃牌" : "结束回合"}</button>;
    }
    return null;
  };

  if (!gameState) return null;

  return (
    <div className="h-screen bg-stone-900 flex flex-row font-sans text-stone-300 overflow-hidden relative">
      <GameLogSidebar logs={gameState.logs} currentPlayerId={null} />
      <div className="flex-1 flex flex-col relative h-full overflow-hidden">
          <div className="absolute inset-0 bg-stone-900 z-0"></div>
          <VisualEffectsLayer events={gameState.visualEvents} onEventComplete={() => {}} />
          {activeEffect && <EffectOverlay effect={activeEffect} onDismiss={dismissActiveEffect} />}
          {interaction && interaction.playerId === 1 && <InteractionOverlay request={interaction} />}
          <PhaseBar currentPhase={phase} turn={gameState.turnCount} />
          <div className="flex-grow flex flex-col relative overflow-hidden z-10">
            <PlayerArea player={player2} isOpponent phase={phase} selectedCardId={p2SelectedCardId} mustDiscard={false} canSet={false} canInstant={false} isResolving={isResolving} instantWindow={instantWindow} onSelect={() => {}} onInstant={() => {}} enableControls={false} hideHand={!revealAIHand} debugInfo={aiDebugInfo} />
            <FieldArea gameState={gameState} player1={player1} player2={player2} />
            <PlayerArea player={player1} phase={phase} selectedCardId={p1SelectedCardId} mustDiscard={p1MustDiscard} canSet={true} canInstant={true} isResolving={isResolving} instantWindow={instantWindow} onSelect={(c) => handleCardClick(player1, c)} onInstant={(id) => {}} enableControls={true} hideHand={false} />
          </div>
          <div className="bg-stone-900/80 backdrop-blur-md border-t border-stone-800/50 p-4 flex justify-center items-center h-24 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-30 relative shrink-0">
             <div className="w-full max-w-sm flex items-center justify-center">{getActionButton()}</div>
          </div>
      </div>
    </div>
  );
}
