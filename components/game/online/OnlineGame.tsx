
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { Card, GamePhase, InstantWindow, GameState, PlayerState, EffectContext, PendingEffect, Keyword, CardDefinition, InteractionRequest } from '../../../types';
import { NetworkMessage, NetworkRole, GameActionPayload } from '../../../types/network'; 
import { generateDeck, shuffleDeck, sanitizeGameState, hydrateGameState } from '../../../services/gameUtils';
import { drawCards, discardCards, getOpponentId, destroyCard, updateQuestProgress } from '../../../services/actions'; 
import { MAX_HAND_SIZE, INITIAL_ATK } from '../../../constants';
import { CARD_DEFINITIONS } from '../../../data/cards';

import { PhaseBar } from '../../PhaseBar';
import { PlayerArea } from '../../PlayerArea';
import { FieldArea } from '../../FieldArea';
import { InteractionOverlay, EffectOverlay, GameOverOverlay, GalleryOverlay, CardPileOverlay } from '../../overlays';
import { NetworkDebugOverlay } from './NetworkDebugOverlay'; 
import { VisualEffectsLayer } from '../../VisualEffectsLayer';
import { ConnectionScreen } from './ConnectionScreen';
import { GameLogSidebar } from '../../GameLogSidebar';

// Import Logic Phases
import { executeDrawPhase } from '../../../logic/phases/draw';
import { executeSetPhase } from '../../../logic/phases/set';
import { executeFlipCards, executeResolveEffects } from '../../../logic/phases/reveal';
import { executeDiscardPhase } from '../../../logic/phases/discard';

interface OnlineGameProps {
    enabledCardIds: string[];
    initialHp: number;
    initialHandSize: number;
    onExit: () => void;
}

type ConnectionState = 'IDLE' | 'HOSTING' | 'CONNECTING' | 'CONNECTED';

export const OnlineGame: React.FC<OnlineGameProps> = ({ enabledCardIds, initialHp, initialHandSize, onExit }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [role, setRole] = useState<NetworkRole>('HOST'); 
  const [connState, setConnState] = useState<ConnectionState>('IDLE');
  const [myPeerId, setMyPeerId] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [networkLogs, setNetworkLogs] = useState<NetworkMessage[]>([]);
  const [showNetworkDebug, setShowNetworkDebug] = useState(false);

  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const roleRef = useRef<NetworkRole>('HOST');
  
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { roleRef.current = role; }, [role]);

  const p2SelectedCardIdRef = useRef<string | null>(null);
  const [p1SelectedCardId, setP1SelectedCardId] = useState<string | null>(null);
  const [p2SelectedCardId, setP2SelectedCardId] = useState<string | null>(null); 
  const phaseLockRef = useRef(false);
  const [showGallery, setShowGallery] = useState(false);
  const [viewingPile, setViewingPile] = useState<{ type: 'DISCARD' | 'DECK' | 'VAULT', pid: number, cards: Card[], title: string, sorted?: boolean } | null>(null);
  const activeEffectResolverRef = useRef<(() => void) | null>(null);

  useEffect(() => {
      return () => {
          if (connRef.current) connRef.current.close();
          if (peerRef.current) peerRef.current.destroy();
      };
  }, []);

  const initializeGame = () => {
      const allowedDefs = CARD_DEFINITIONS.filter(c => enabledCardIds.includes(c.id) || c.isTreasure);
      const finalDefs = allowedDefs.length < 10 ? CARD_DEFINITIONS : allowedDefs;
      const p1Deck = shuffleDeck(generateDeck(1, finalDefs));
      const p2Deck = shuffleDeck(generateDeck(2, finalDefs));
      const p1Hand = p1Deck.splice(0, initialHandSize);
      const p2Hand = p2Deck.splice(0, initialHandSize);
      const initialPlayerState = (id: number, deck: Card[], hand: Card[]): PlayerState => ({
        id, name: `Player ${id}`, hp: initialHp, atk: INITIAL_ATK,
        deck, hand, discardPile: [], fieldSlot: null, isFieldCardRevealed: false,
        immunityThisTurn: false, immunityNextTurn: false, effectDoubleNext: false,
        isReversed: false, isInvalidated: false, hpRecoverNextTurn: 0, invalidateNextPlayedCard: false, invalidateNextTurn: false,
        preventTransform: 0, preventHealing: false, hasLifesteal: false, damageReflection: false, incomingDamageConversion: false, nextDamageDouble: false,
        swordsHangedManActive: false, damageTakenThisTurn: 0, piercingDamageThisTurn: false, piercingDamageNextTurn: false,
        delayedEffects: [], maxHandSize: MAX_HAND_SIZE, skipDiscardThisTurn: false, quests: [], swordsSunDamageMult: 1, 
      });
      return {
        phase: GamePhase.DRAW, instantWindow: InstantWindow.NONE, turnCount: 1, logs: ["(联机模式) 游戏开始。"],
        player1: initialPlayerState(1, p1Deck, p1Hand), player2: initialPlayerState(2, p2Deck, p2Hand),
        playerReadyState: { 1: false, 2: false }, field: null, isResolving: false, pendingEffects: [], activeEffect: null, interaction: null, visualEvents: []
      };
  };

  const addNetworkLog = (msg: NetworkMessage) => { setNetworkLogs(prev => [...prev, msg]); };
  const sendNetworkMessage = (type: NetworkMessage['type'], payload: any) => {
      if (!connRef.current || !connRef.current.open) return;
      const safePayload = type === 'GAME_STATE_SYNC' ? sanitizeGameState(payload) : payload;
      const msg: NetworkMessage = { id: `msg-${Date.now()}`, sender: roleRef.current, type, payload: safePayload, timestamp: Date.now() };
      try { addNetworkLog(msg); connRef.current.send(msg); } catch (e) { console.error("Send Error:", e); }
  };

  const processGameActionRef = useRef<(pid: number, action: GameActionPayload) => void>(() => {});
  const handleDataReceive = useCallback((data: any) => {
      const msg = data as NetworkMessage;
      addNetworkLog({ ...msg, id: `recv-${msg.id}` });
      if (roleRef.current === 'HOST') {
          if (msg.type === 'PLAYER_ACTION') processGameActionRef.current(2, msg.payload); 
      } else {
          if (msg.type === 'GAME_STATE_SYNC') setGameState(hydrateGameState(msg.payload));
      }
  }, []);

  const setupPeer = (): Peer => {
      const peer = new Peer(`arcana-${Math.floor(Math.random() * 10000)}`);
      peer.on('error', (err) => { setNetworkError(`Connection Error: ${err.type}`); setConnState('IDLE'); });
      return peer;
  };

  const startHosting = () => {
      setConnState('HOSTING'); setRole('HOST');
      const peer = setupPeer(); peerRef.current = peer;
      peer.on('open', (id) => { setMyPeerId(id); });
      peer.on('connection', (conn) => { connRef.current = conn; setupConnectionEvents(conn); });
  };

  const joinGame = (hostId: string) => {
      setConnState('CONNECTING'); setRole('CLIENT');
      const peer = setupPeer(); peerRef.current = peer;
      peer.on('open', () => { const conn = peer.connect(hostId); connRef.current = conn; setupConnectionEvents(conn); });
  };

  const setupConnectionEvents = (conn: DataConnection) => {
      conn.on('open', () => { setConnState('CONNECTED'); if (roleRef.current === 'HOST') setGameState(initializeGame()); });
      conn.on('data', (data) => handleDataReceive(data));
      conn.on('close', () => { setConnState('IDLE'); setNetworkError("Connection lost."); setGameState(null); });
  };

  useEffect(() => {
      if (role === 'HOST' && connState === 'CONNECTED' && gameState) {
          sendNetworkMessage('GAME_STATE_SYNC', gameState);
      }
  }, [gameState, role, connState]);

  const addLog = (message: string) => { setGameState(prev => prev ? ({ ...prev, logs: [message, ...prev.logs] }) : null); };
  const createEffectContext = (playerId: number, card: Card): EffectContext => {
     const p = (playerId === 1 ? gameStateRef.current?.player1 : gameStateRef.current?.player2) || gameStateRef.current?.player1!; 
     return { gameState: gameStateRef.current!, sourcePlayerId: playerId, card, setGameState, log: addLog, isReversed: p?.isReversed, gameMode: 'ONLINE' };
  };

  const handleToggleReady = (pid: number) => {
      setGameState(prev => prev ? ({ ...prev, playerReadyState: { ...prev.playerReadyState, [pid]: !prev.playerReadyState[pid] } }) : null);
  };

  useEffect(() => {
      if (roleRef.current !== 'HOST' || !gameState) return;
      if (gameState.playerReadyState[1] && gameState.playerReadyState[2] && !gameState.isResolving && !phaseLockRef.current) {
          phaseLockRef.current = true; advancePhase(gameState);
          setTimeout(() => { phaseLockRef.current = false; }, 500);
      }
  }, [gameState?.playerReadyState, gameState?.isResolving]);

  const advancePhase = (currentState: GameState) => {
      setGameState(prev => prev ? ({ ...prev, isResolving: true, playerReadyState: { 1: false, 2: false } }) : null);
      const gs = gameStateRef.current || currentState;
      if (gs.phase === GamePhase.DRAW) executeDrawPhase({ gameState: gs, setGameState, createEffectContext });
      else if (gs.phase === GamePhase.SET) { executeSetPhase({ setGameState, p1SelectedCardId, p2SelectedCardId: p2SelectedCardIdRef.current }); setP1SelectedCardId(null); p2SelectedCardIdRef.current = null; setP2SelectedCardId(null); }
      else if (gs.phase === GamePhase.REVEAL) {
          if (gs.instantWindow === InstantWindow.BEFORE_REVEAL) { executeFlipCards({ gameState: gs, setGameState, addLog }); setP1SelectedCardId(null); p2SelectedCardIdRef.current = null; setP2SelectedCardId(null); }
          else if (gs.instantWindow === InstantWindow.AFTER_REVEAL) executeResolveEffects({ gameStateRef, setGameState, addLog, createEffectContext, triggerVisualEffect });
      }
      else if (gs.phase === GamePhase.DISCARD) executeDiscardPhase({ gameState: gs, setGameState, createEffectContext });
  };

  const handleVisualEventComplete = (id: string) => { setGameState(prev => prev ? ({ ...prev, visualEvents: prev.visualEvents.filter(e => e.id !== id) }) : null); };
  const dismissActiveEffectHost = () => {
     if (roleRef.current !== 'HOST' || !gameStateRef.current?.activeEffect) return;
     const effect = gameStateRef.current.activeEffect;
     if (effect.type === 'ON_DRAW' && effect.card.onDraw) effect.card.onDraw(createEffectContext(effect.playerId, effect.card));
     else if (effect.type === 'ON_DISCARD' && effect.card.onDiscard) effect.card.onDiscard(createEffectContext(effect.playerId, effect.card));
     setGameState(prev => prev ? ({ ...prev, activeEffect: null }) : null);
     if (activeEffectResolverRef.current) { activeEffectResolverRef.current(); activeEffectResolverRef.current = null; }
  };

  const handleDismissEffect = () => { if (role === 'HOST') dismissActiveEffectHost(); else sendNetworkMessage('PLAYER_ACTION', { actionType: 'DISMISS_EFFECT' }); };
  const triggerVisualEffect = async (type: PendingEffect['type'], card: Card, pid: number, desc?: string) => {
      return new Promise<void>((resolve) => { activeEffectResolverRef.current = resolve; setGameState(prev => prev ? ({ ...prev, activeEffect: { type, card, playerId: pid, description: desc } }) : null); });
  };

  const processGameAction = (playerId: number, action: GameActionPayload) => {
      if (!gameStateRef.current) return;
      const gs = gameStateRef.current;
      const player = playerId === 1 ? gs.player1 : gs.player2;
      if (action.actionType === 'UPDATE_SELECTION' && playerId === 2) { p2SelectedCardIdRef.current = action.cardId || null; setP2SelectedCardId(action.cardId || null); }
      else if (action.actionType === 'DISCARD_CARD' && action.cardId) {
          if (gs.phase === GamePhase.DISCARD) {
              const card = player.hand.find(c => c.instanceId === action.cardId);
              // 修改：主机验证弃牌合法性（必须保留至少一张）
              if (card && !card.isTreasure && player.hand.length >= 2) {
                  discardCards(createEffectContext(playerId, card), playerId, [card.instanceId]);
              }
          }
      }
      else if (action.actionType === 'USE_INSTANT' && action.cardId) { /* ... handle instant ... */ }
      else if (action.actionType === 'TOGGLE_READY') handleToggleReady(playerId);
      else if (action.actionType === 'DISMISS_EFFECT') dismissActiveEffectHost();
      else if (action.actionType === 'CONFIRM_INTERACTION') { /* ... handle interaction ... */ }
  };
  useEffect(() => { processGameActionRef.current = processGameAction; }, [gameState, p1SelectedCardId, p2SelectedCardId]);

  const handleCardClick = (player: PlayerState, card: Card) => {
    const myId = role === 'HOST' ? 1 : 2;
    if (player.id !== myId || !gameState || gameState.isResolving || gameState.phase === GamePhase.GAME_OVER) return;
    if (gameState.phase === GamePhase.DISCARD) {
         if (card.isTreasure) return;
         // 修改：客户端验证弃牌合法性
         if (player.hand.length < 2) return;
         if (role === 'HOST') discardCards(createEffectContext(player.id, card), player.id, [card.instanceId]);
         else sendNetworkMessage('PLAYER_ACTION', { actionType: 'DISCARD_CARD', cardId: card.instanceId });
         return;
    }
    if (gameState.phase === GamePhase.SET || gameState.instantWindow !== InstantWindow.NONE) {
        if (role === 'HOST') setP1SelectedCardId(card.instanceId === p1SelectedCardId ? null : card.instanceId);
        else { setP2SelectedCardId(card.instanceId === p2SelectedCardId ? null : card.instanceId); sendNetworkMessage('PLAYER_ACTION', { actionType: 'UPDATE_SELECTION', cardId: card.instanceId === p2SelectedCardId ? null : card.instanceId }); }
    }
  };

  const handleInstantUse = (player: PlayerState, cardInstanceId: string | null) => { /* ... similar to Local ... */ };
  const openPileView = (type: any, pid: number) => { /* ... similar to Local ... */ };

  const getActionButton = () => {
    if (!gameState) return null;
    const myId = role === 'HOST' ? 1 : 2;
    const me = myId === 1 ? gameState.player1 : gameState.player2;
    const isMyReady = gameState.playerReadyState[myId];
    if (gameState.phase === GamePhase.GAME_OVER) return <div className="text-2xl font-black text-red-600 animate-pulse font-serif">游戏结束</div>;
    const commonClasses = "w-full py-3 rounded-lg font-serif font-black text-lg tracking-widest shadow-md transition-all transform duration-200 border-b-4 active:border-b-0 active:translate-y-1";
    const onAction = () => { if (role === 'HOST') handleToggleReady(1); else sendNetworkMessage('PLAYER_ACTION', { actionType: 'TOGGLE_READY' }); };
    if (gameState.phase === GamePhase.DRAW) return <button onClick={onAction} disabled={isMyReady} className={`${commonClasses} ${isMyReady ? 'bg-stone-800' : 'bg-stone-700'}`}>{isMyReady ? "等待对手..." : "抽牌阶段 (准备)"}</button>;
    if (gameState.phase === GamePhase.SET) return <button onClick={onAction} disabled={isMyReady} className={`${commonClasses} ${isMyReady ? 'bg-stone-800' : 'bg-emerald-800'}`}>{isMyReady ? "等待对手..." : "确认盖牌"}</button>;
    if (gameState.phase === GamePhase.REVEAL) return <button onClick={onAction} disabled={isMyReady} className={`${commonClasses} ${isMyReady ? 'bg-stone-800' : 'bg-amber-800'}`}>{isMyReady ? "等待对手..." : "揭示/结算"}</button>;
    if (gameState.phase === GamePhase.DISCARD) {
       const handCount = me.hand.filter(c => !c.isTreasure).length;
       // 修改：只需手牌 <= 3 即可点击结束
       const mustDiscard = handCount > me.maxHandSize && !me.skipDiscardThisTurn;
       const disabled = mustDiscard || isMyReady;
       return <button onClick={onAction} disabled={disabled} className={`${commonClasses} ${disabled ? 'bg-stone-800' : 'bg-stone-700'}`}>{mustDiscard ? "请先弃牌" : (isMyReady ? "等待对手..." : "结束回合")}</button>;
    }
    return null;
  };

  if (connState !== 'CONNECTED' || !gameState) return <ConnectionScreen onCreateGame={startHosting} onJoinGame={joinGame} onBack={onExit} isConnecting={connState === 'CONNECTING'} hostId={myPeerId} error={networkError} />;
  
  // FIX: Destructure activeEffect and interaction from gameState for use in JSX
  const { activeEffect, interaction, phase, turnCount, instantWindow, isResolving, visualEvents } = gameState;
  const myId = role === 'HOST' ? 1 : 2;
  const me = myId === 1 ? gameState.player1 : gameState.player2;
  const opp = myId === 1 ? gameState.player2 : gameState.player1;
  
  return (
    <div className="h-screen bg-stone-900 flex flex-row font-sans text-stone-300 overflow-hidden relative">
      <GameLogSidebar logs={gameState.logs} currentPlayerId={myId} />
      <div className="flex-1 flex flex-col relative h-full overflow-hidden">
          <div className="absolute inset-0 bg-stone-900 z-0"></div>
          {/* Fix: use visualEvents from destructuring */}
          <VisualEffectsLayer events={visualEvents} onEventComplete={handleVisualEventComplete} />
          <div className="absolute top-4 right-4 z-50 flex gap-3">
             <button onClick={onExit} className="text-[10px] bg-red-900/40 text-red-300 px-3 py-2 rounded border border-red-900/30 backdrop-blur">退出</button>
             <button onClick={() => setShowNetworkDebug(!showNetworkDebug)} className="text-[10px] bg-stone-900/60 text-emerald-500 border border-emerald-900/30 px-3 py-2 rounded backdrop-blur">📶 网络: {connState}</button>
          </div>
          {/* activeEffect and interaction are now available in scope */}
          {activeEffect && <EffectOverlay effect={activeEffect} onDismiss={handleDismissEffect} />}
          {interaction && interaction.playerId === myId && <InteractionOverlay request={interaction} />}
          <PhaseBar currentPhase={phase} turn={turnCount} />
          <div className="flex-grow flex flex-col relative overflow-hidden z-10">
            <PlayerArea player={opp} isOpponent={true} phase={phase} selectedCardId={null} mustDiscard={false} canSet={false} canInstant={false} isResolving={isResolving} instantWindow={instantWindow} onSelect={() => {}} onInstant={() => {}} onViewDiscard={() => openPileView('DISCARD', opp.id)} enableControls={false} hideHand={true} />
            <FieldArea gameState={gameState} player1={gameState.player1} player2={gameState.player2} />
            <PlayerArea player={me} phase={phase} selectedCardId={myId === 1 ? p1SelectedCardId : p2SelectedCardId} mustDiscard={false} canSet={true} canInstant={true} isResolving={isResolving} instantWindow={instantWindow} onSelect={(c) => handleCardClick(me, c)} onInstant={(id) => handleInstantUse(me, id)} onViewDiscard={() => openPileView('DISCARD', me.id)} enableControls={true} hideHand={false} />
          </div>
          <div className="bg-stone-900/80 backdrop-blur-md border-t border-stone-800/50 p-4 flex justify-center items-center h-24 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-30 relative shrink-0">
             <div className="w-full max-w-sm flex items-center justify-center">{getActionButton()}</div>
          </div>
      </div>
    </div>
  );
}
