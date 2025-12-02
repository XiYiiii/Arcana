
import React, { useState, useEffect, useRef } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { Card, GamePhase, InstantWindow, GameState, PlayerState, EffectContext, PendingEffect, Keyword, CardDefinition } from '../../../types';
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
  
  // --- Network State ---
  const [role, setRole] = useState<NetworkRole>('HOST'); 
  const [connState, setConnState] = useState<ConnectionState>('IDLE');
  const [myPeerId, setMyPeerId] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  
  const [networkLogs, setNetworkLogs] = useState<NetworkMessage[]>([]);
  const [showNetworkDebug, setShowNetworkDebug] = useState(false);

  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);

  // --- Local Selection State ---
  // Host needs Refs to access latest values inside async/event closures without stale state
  const p2SelectedCardIdRef = useRef<string | null>(null);
  const [p1SelectedCardId, setP1SelectedCardId] = useState<string | null>(null);
  const [p2SelectedCardId, setP2SelectedCardId] = useState<string | null>(null); // For UI Sync
  
  // UI State
  const [showGallery, setShowGallery] = useState(false);
  const [viewingPile, setViewingPile] = useState<{ type: 'DISCARD' | 'DECK' | 'VAULT', pid: number, cards: Card[], title: string, sorted?: boolean } | null>(null);

  // Visual Effect Resolver
  const activeEffectResolverRef = useRef<(() => void) | null>(null);
  const gameStateRef = useRef<GameState | null>(null);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // --- Cleanup on Unmount ---
  useEffect(() => {
      return () => {
          if (connRef.current) connRef.current.close();
          if (peerRef.current) peerRef.current.destroy();
      };
  }, []);

  // --- Initial Game Setup Logic (Reused) ---
  const initializeGame = () => {
      const allowedDefs = CARD_DEFINITIONS.filter(c => enabledCardIds.includes(c.id) || c.isTreasure);
      const finalDefs = allowedDefs.length < 10 ? CARD_DEFINITIONS : allowedDefs;
      
      const p1Deck = shuffleDeck(generateDeck(1, finalDefs));
      const p2Deck = shuffleDeck(generateDeck(2, finalDefs));
      const p1Hand = p1Deck.splice(0, initialHandSize);
      const p2Hand = p2Deck.splice(0, initialHandSize);

      const initialPlayerState = (id: number, deck: Card[], hand: Card[]): PlayerState => ({
        id, name: `Player ${id}`, hp: initialHp, atk: INITIAL_ATK,
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

      return {
        phase: GamePhase.DRAW,
        instantWindow: InstantWindow.NONE,
        turnCount: 1,
        logs: ["(联机模式) 游戏开始。"],
        player1: initialPlayerState(1, p1Deck, p1Hand),
        player2: initialPlayerState(2, p2Deck, p2Hand),
        playerReadyState: { 1: false, 2: false },
        field: null,
        isResolving: false,
        pendingEffects: [],
        activeEffect: null,
        interaction: null,
        visualEvents: []
      };
  };

  // --- Network Infrastructure ---

  const addNetworkLog = (msg: NetworkMessage) => {
      setNetworkLogs(prev => [...prev, msg]);
  };

  const sendNetworkMessage = (type: NetworkMessage['type'], payload: any) => {
      if (!connRef.current || !connRef.current.open) {
          console.warn("Connection not open, cannot send message");
          return;
      }

      // IMPORTANT: Sanitize payload if it's a game state
      const safePayload = type === 'GAME_STATE_SYNC' ? sanitizeGameState(payload) : payload;

      const msg: NetworkMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          sender: role,
          type,
          payload: safePayload,
          timestamp: Date.now()
      };

      try {
          addNetworkLog(msg);
          connRef.current.send(msg);
      } catch (e) {
          console.error("Send Error:", e);
      }
  };

  const handleDataReceive = (data: any) => {
      const msg = data as NetworkMessage;
      addNetworkLog({ ...msg, id: `recv-${msg.id}` }); // Log incoming

      if (role === 'HOST') {
          // HOST Logic
          if (msg.type === 'PLAYER_ACTION') {
              const action = msg.payload as GameActionPayload;
              processGameAction(2, action);
          }
      } else {
          // CLIENT Logic
          if (msg.type === 'GAME_STATE_SYNC') {
              // IMPORTANT: Hydrate the state to re-attach functions
              const syncedState = hydrateGameState(msg.payload);
              setGameState(syncedState);
          }
      }
  };

  // --- Peer Setup Handlers ---

  const setupPeer = (): Peer => {
      const id = `arcana-${Math.floor(Math.random() * 10000)}`;
      const peer = new Peer(id);
      
      peer.on('error', (err) => {
          console.error(err);
          setNetworkError(`Connection Error: ${err.type}`);
          setConnState('IDLE');
      });

      return peer;
  };

  const startHosting = () => {
      setNetworkError(null);
      setConnState('HOSTING');
      setRole('HOST');
      
      const peer = setupPeer();
      peerRef.current = peer;

      peer.on('open', (id) => {
          setMyPeerId(id);
      });

      peer.on('connection', (conn) => {
          connRef.current = conn;
          setupConnectionEvents(conn);
      });
  };

  const joinGame = (hostId: string) => {
      setNetworkError(null);
      setConnState('CONNECTING');
      setRole('CLIENT');

      const peer = setupPeer();
      peerRef.current = peer;

      peer.on('open', () => {
          const conn = peer.connect(hostId);
          connRef.current = conn;
          setupConnectionEvents(conn);
      });
  };

  const setupConnectionEvents = (conn: DataConnection) => {
      conn.on('open', () => {
          setConnState('CONNECTED');
          setNetworkError(null);
          
          if (role === 'HOST') {
              // Host initializes game and sends initial state
              const newState = initializeGame();
              setGameState(newState);
          }
      });

      conn.on('data', (data) => {
          handleDataReceive(data);
      });

      conn.on('close', () => {
          setConnState('IDLE');
          setNetworkError("Connection lost.");
          setGameState(null);
      });

      conn.on('error', (err) => {
          console.error("Conn error:", err);
          setNetworkError("Connection error occurred.");
      });
  };

  // --- Logic Helpers ---

  // Host executes logic, then syncs state to client
  useEffect(() => {
      if (role === 'HOST' && connState === 'CONNECTED' && gameState) {
          // Construct message
          const safePayload = sanitizeGameState(gameState);
          
          const msg: NetworkMessage = {
              id: `sync-${Date.now()}`,
              sender: 'HOST',
              type: 'GAME_STATE_SYNC',
              payload: safePayload,
              timestamp: Date.now()
          };
          
          if (connRef.current?.open) {
              try {
                  connRef.current.send(msg);
              } catch(e) {
                  console.error("Sync Failed:", e);
              }
          }
      }
  }, [gameState, role, connState]);


  // The Core Logic Processor (Runs on HOST)
  const processGameAction = (playerId: number, action: GameActionPayload) => {
      if (!gameStateRef.current) return;
      const gs = gameStateRef.current;
      const player = playerId === 1 ? gs.player1 : gs.player2;

      // console.log(`[HOST] Processing Action from P${playerId}:`, action);

      if (action.actionType === 'UPDATE_SELECTION') {
          // Host records P2 selection based on what client sent (Absolute Update)
          // cardId can be null, which means deselect
          if (playerId === 2) {
              p2SelectedCardIdRef.current = action.cardId || null;
              setP2SelectedCardId(action.cardId || null); // Update state for UI if needed (Host usually doesn't see P2 select)
          }
          
          // Execute Discard Logic immediately if phase matches and cardId is present
          if (gs.phase === GamePhase.DISCARD && action.cardId) {
              const card = player.hand.find(c => c.instanceId === action.cardId);
              if (card && !card.isTreasure) {
                  const handCount = player.hand.filter(c => !c.isTreasure).length;
                  if (handCount > player.maxHandSize && !player.skipDiscardThisTurn) {
                      const ctx = createEffectContext(playerId, card);
                      discardCards(ctx, playerId, [card.instanceId]);
                  }
              }
          }
      }
      else if (action.actionType === 'USE_INSTANT' && action.cardId) {
          handleInstantUseLogic(player, action.cardId);
      }
      else if (action.actionType === 'TOGGLE_READY') {
          handleToggleReady(playerId);
      }
  };

  // --- Standard Game Logic (Host Only) ---
  const addLog = (message: string) => {
    setGameState(prev => prev ? ({ ...prev, logs: [message, ...prev.logs] }) : null);
  };

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

  // --- Phase Auto-Trigger Logic (Host Only) ---
  const handleToggleReady = (pid: number) => {
      setGameState(prev => {
          if (!prev) return null;
          const nextReadyState = { ...prev.playerReadyState, [pid]: !prev.playerReadyState[pid] };
          
          // CHECK FOR PHASE ADVANCEMENT
          const p1Ready = nextReadyState[1];
          const p2Ready = nextReadyState[2];

          if (p1Ready && p2Ready && !prev.isResolving) {
              // Trigger next phase immediately
              setTimeout(() => advancePhase(prev), 50); // Small timeout to allow state sync of "Both Ready" first
              
              // Reset ready states in the next tick via advancePhase logic or here?
              // Better to do it here to prevent double trigger? 
              // Actually, advancePhase will update state, which overrides this.
              // But we should return the "Both Ready" state first so the Client sees it briefly.
          }

          return { ...prev, playerReadyState: nextReadyState };
      });
  };

  const advancePhase = (currentState: GameState) => {
      console.log("[HOST] Executing phase advancement...");
      
      // 1. Reset Ready State immediately
      setGameState(prev => prev ? ({ ...prev, playerReadyState: { 1: false, 2: false } }) : null);

      // 2. Execute Phase Logic
      if (currentState.phase === GamePhase.DRAW) {
          executeDrawPhase({ gameState: gameStateRef.current, setGameState, createEffectContext });
      } 
      else if (currentState.phase === GamePhase.SET) {
          executeSetPhase({ 
              setGameState, 
              p1SelectedCardId, 
              p2SelectedCardId: p2SelectedCardIdRef.current, // Use REF for fresh value
              setP1SelectedCardId, 
              setP2SelectedCardId: (val: string | null) => {
                  p2SelectedCardIdRef.current = val;
                  setP2SelectedCardId(val);
              }
          });
      }
      else if (currentState.phase === GamePhase.REVEAL) {
          if (currentState.instantWindow === InstantWindow.BEFORE_REVEAL) {
              executeFlipCards({ gameState: gameStateRef.current, setGameState, addLog, setP1SelectedCardId, setP2SelectedCardId: (val: string | null) => {
                  p2SelectedCardIdRef.current = val;
                  setP2SelectedCardId(val);
              }});
          } else if (currentState.instantWindow === InstantWindow.AFTER_REVEAL) {
              executeResolveEffects({ gameStateRef, setGameState, addLog, createEffectContext, triggerVisualEffect });
          }
      }
      else if (currentState.phase === GamePhase.DISCARD) {
          executeDiscardPhase({ gameState: gameStateRef.current, setGameState, createEffectContext });
      }
  };

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

  // --- Active Effect Logic ---
  const dismissActiveEffect = () => {
     // Host dismisses, which updates state, which syncs to client. Client UI closes.
     if (role === 'HOST' && gameState?.activeEffect) {
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

  // --- Interactions (Both Sides) ---
  const handleCardClick = (player: PlayerState, card: Card) => {
    const myId = role === 'HOST' ? 1 : 2;
    if (player.id !== myId) return;
    if (!gameState) return;
    if (gameState?.isResolving || gameState?.phase === GamePhase.GAME_OVER) return;

    // 1. Update Local UI Selection
    let newSelectionId: string | null = null;
    if (myId === 1) {
        newSelectionId = card.instanceId === p1SelectedCardId ? null : card.instanceId;
        setP1SelectedCardId(newSelectionId);
    } else {
        newSelectionId = card.instanceId === p2SelectedCardId ? null : card.instanceId;
        setP2SelectedCardId(newSelectionId);
    }

    // 2. Send Action
    if (role === 'CLIENT') {
        sendNetworkMessage('PLAYER_ACTION', { actionType: 'UPDATE_SELECTION', cardId: newSelectionId });
    } else {
        // Host logic for Discard Phase (Direct interaction)
        if (gameState.phase === GamePhase.DISCARD) {
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
    }
  };

  const handleInstantUse = (cardInstanceId: string) => {
      if (role === 'HOST') {
          if (!gameState) return;
          const player = gameState.player1;
          handleInstantUseLogic(player, cardInstanceId);
      } else {
          sendNetworkMessage('PLAYER_ACTION', { actionType: 'USE_INSTANT', cardId: cardInstanceId });
      }
  };

  const handleInstantUseLogic = async (player: PlayerState, cardInstanceId: string | null) => {
    if (!cardInstanceId || !gameStateRef.current || gameStateRef.current.isResolving) return;
    const card = player.hand.find(c => c.instanceId === cardInstanceId);
    if (!card || !card.onInstant) return;

    if (card.isLocked) return;
    if (card.canInstant && !card.canInstant(gameStateRef.current.instantWindow)) return;
    
    setGameState(prev => prev ? ({ ...prev, isResolving: true }) : null);
    await triggerVisualEffect('INSTANT', card, player.id, "发动插入特效！");
    
    const ctx = createEffectContext(player.id, card);
    card.onInstant && card.onInstant(ctx);
    
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
    else {
        p2SelectedCardIdRef.current = null;
        setP2SelectedCardId(null);
    }
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
          if (pid !== (role === 'HOST' ? 1 : 2)) return;
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

  // --- Ready Button Handler ---
  const handleReadyClick = () => {
      if (role === 'HOST') {
          handleToggleReady(1);
      } else {
          // Optimistic update for UI responsiveness? No, wait for server sync to avoid desync.
          // Just send message.
          sendNetworkMessage('PLAYER_ACTION', { actionType: 'TOGGLE_READY' });
      }
  };

  // --- Main Render Logic ---

  if (connState !== 'CONNECTED' || !gameState) {
      return (
          <ConnectionScreen 
              onCreateGame={startHosting}
              onJoinGame={joinGame}
              onBack={onExit}
              isConnecting={connState === 'CONNECTING' || connState === 'HOSTING'}
              hostId={myPeerId}
              error={networkError}
          />
      );
  }

  const { phase, instantWindow, player1, player2, isResolving, activeEffect, interaction, field, playerReadyState } = gameState;
  const myId = role === 'HOST' ? 1 : 2;
  const myPlayer = myId === 1 ? player1 : player2;
  const oppPlayer = myId === 1 ? player2 : player1;
  
  // Selection Logic for Ready Button enablement
  const mySelectionId = myId === 1 ? p1SelectedCardId : p2SelectedCardId;
  const myHand = myPlayer.hand;
  const myHandCount = myHand.filter(c => !c.isTreasure).length;
  
  let canReady = true;
  if (phase === GamePhase.SET) {
      if (myHand.length > 0 && !mySelectionId) canReady = false;
  } else if (phase === GamePhase.DISCARD) {
      const mustDiscard = myHandCount > myPlayer.maxHandSize && !myPlayer.skipDiscardThisTurn;
      if (mustDiscard) canReady = false; 
  }

  const myReady = playerReadyState[myId];
  const oppReady = playerReadyState[myId === 1 ? 2 : 1];

  const getActionButton = () => {
    if (phase === GamePhase.GAME_OVER) return <div className="text-2xl font-black text-red-600 animate-pulse font-serif">游戏结束</div>;
    
    if (myReady && !oppReady) {
        return (
            <div className="flex flex-col items-center gap-2 w-full">
                <button 
                    onClick={handleReadyClick} 
                    className="w-full py-3 rounded-lg font-serif font-black text-lg tracking-widest shadow-md transition-all border-b-4 bg-emerald-800 text-emerald-200 border-emerald-950 active:translate-y-1 active:border-b-0 hover:bg-emerald-700"
                >
                    已准备 (取消)
                </button>
                <span className="text-[10px] text-stone-500 animate-pulse">等待对方...</span>
            </div>
        );
    }

    if (myReady && oppReady) {
        return <div className="text-emerald-500 font-bold animate-pulse text-lg">处理中...</div>;
    }

    const commonClasses = "w-full py-3 rounded-lg font-serif font-black text-lg tracking-widest shadow-md transition-all transform duration-200 border-b-4 active:border-b-0 active:translate-y-1";
    const disabledClasses = "bg-stone-800 border-stone-900 text-stone-600 cursor-not-allowed";
    const readyClasses = "bg-stone-700 hover:bg-stone-600 hover:shadow-stone-500/20 text-stone-200 border-stone-900";

    return (
        <button 
            onClick={handleReadyClick} 
            disabled={!canReady}
            className={`${commonClasses} ${!canReady ? disabledClasses : readyClasses}`}
        >
            {phase === GamePhase.SET && !canReady ? "请先盖牌" : 
             phase === GamePhase.DISCARD && !canReady ? "请先弃牌" : 
             "准备 (Ready)"}
        </button>
    );
  };

  return (
    <div className="min-h-screen bg-stone-900 flex flex-col font-sans text-stone-300 overflow-hidden selection:bg-amber-900/50 relative">
      <div className="absolute inset-0 bg-stone-900 z-0"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(28,25,23,0)_0%,_rgba(0,0,0,0.5)_100%)] z-0 pointer-events-none"></div>
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] z-0"></div>
      
      <VisualEffectsLayer events={gameState.visualEvents} onEventComplete={handleVisualEventComplete} />

      {/* Top Bar */}
      <div className="absolute top-4 right-4 z-50 flex gap-3">
         <div className="flex items-center gap-2 px-3 py-2 bg-stone-900/60 rounded border border-stone-800 backdrop-blur text-[10px]">
             <span className={`w-2 h-2 rounded-full ${connState==='CONNECTED'?'bg-emerald-500':'bg-red-500'}`}></span>
             <span className="text-stone-400 font-bold">{role === 'HOST' ? '主机' : '客机'}</span>
         </div>
         <button onClick={onExit} className="text-[10px] bg-stone-900/60 text-red-400 hover:text-red-300 px-3 py-2 rounded border border-red-900/30 backdrop-blur">退出</button>
         <button onClick={() => setShowNetworkDebug(!showNetworkDebug)} className="text-[10px] bg-stone-900/60 text-blue-400 px-3 py-2 rounded border border-blue-900/30 backdrop-blur">网络</button>
      </div>

      {showNetworkDebug && <NetworkDebugOverlay logs={networkLogs} role={role} onSimulateReceive={()=>{}} onClearLogs={()=>setNetworkLogs([])} onClose={()=>setShowNetworkDebug(false)} />}
      {showGallery && <GalleryOverlay onClose={() => setShowGallery(false)} />}
      {viewingPile && <CardPileOverlay title={viewingPile.title} cards={viewingPile.cards} onClose={() => setViewingPile(null)} sorted={viewingPile.sorted} />}

      {phase === GamePhase.GAME_OVER && <GameOverOverlay result={gameState.logs[0]} onRestart={onExit} />}
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
         <span className="ml-4 text-xs font-bold text-indigo-400">
             [我方: {myReady ? '✅' : '⏳'}] [对方: {oppReady ? '✅' : '⏳'}]
         </span>
      </div>

      {isResolving && !activeEffect && !interaction && (
         <div className="absolute inset-0 z-[45] flex items-center justify-center pointer-events-none">
            <div className="bg-black/70 text-amber-500 px-8 py-4 rounded-xl text-lg font-serif font-bold shadow-2xl backdrop-blur-md border border-amber-900/30 animate-pulse">
               同步处理中...
            </div>
         </div>
      )}

      <div className="flex-grow flex flex-col relative overflow-hidden z-10">
        <PlayerArea 
          player={oppPlayer} isOpponent phase={phase} 
          selectedCardId={null} mustDiscard={false} 
          canSet={false} canInstant={false} isResolving={isResolving} instantWindow={instantWindow}
          onSelect={(c) => {}} onInstant={(id) => {}}
          onViewDiscard={() => openPileView('DISCARD', oppPlayer.id)}
          onViewDeck={() => {}} 
          onViewVault={() => openPileView('VAULT', oppPlayer.id)}
        />
        
        <FieldArea gameState={gameState} player1={player1} player2={player2} />

        <PlayerArea 
          player={myPlayer} phase={phase} 
          selectedCardId={mySelectionId} 
          mustDiscard={myHandCount > myPlayer.maxHandSize && !myPlayer.skipDiscardThisTurn}
          canSet={phase === GamePhase.SET} 
          canInstant={instantWindow !== InstantWindow.NONE} 
          isResolving={isResolving} instantWindow={instantWindow}
          onSelect={(c) => handleCardClick(myPlayer, c)} 
          onInstant={(id) => handleInstantUse(id)}
          onViewDiscard={() => openPileView('DISCARD', myPlayer.id)}
          onViewDeck={() => openPileView('DECK', myPlayer.id)}
          onViewVault={() => openPileView('VAULT', myPlayer.id)}
        />
      </div>

      {/* Bottom Action Panel */}
      <div className="bg-stone-900/80 backdrop-blur-md border-t border-stone-800/50 p-4 flex gap-6 h-40 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-30 relative">
         <div className="w-1/3 max-w-xs flex flex-col items-center justify-center border-r border-stone-800/50 pr-4">
            {getActionButton()}
         </div>
         <div className="w-2/3 flex-grow overflow-y-auto font-mono text-[10px] space-y-1 pl-2 mask-image-gradient-b">
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
