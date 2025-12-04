
import React, { useState, useEffect, useRef } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { GameState, GamePhase, InstantWindow, Card, PlayerState, EffectContext, PendingEffect } from '../../../types';
import { NetworkMessage, NetworkRole, GameActionPayload, GameActionType } from '../../../types/network';
import { generateDeck, shuffleDeck, sanitizeGameState, hydrateGameState } from '../../../services/gameUtils';
import { INITIAL_ATK } from '../../../constants';
import { CARD_DEFINITIONS } from '../../../data/cards';

import { PhaseBar } from '../../PhaseBar';
import { PlayerArea } from '../../PlayerArea';
import { FieldArea } from '../../FieldArea';
import { GameLogSidebar } from '../../GameLogSidebar';
import { InteractionOverlay, EffectOverlay, GameOverOverlay, CardPileOverlay, GalleryOverlay } from '../../overlays';
import { VisualEffectsLayer } from '../../VisualEffectsLayer';
import { ConnectionScreen } from './ConnectionScreen';
import { NetworkDebugOverlay } from './NetworkDebugOverlay';

import { executeDrawPhase } from '../../../logic/phases/draw';
import { executeSetPhase } from '../../../logic/phases/set';
import { executeFlipCards, executeResolveEffects } from '../../../logic/phases/reveal';
import { executeDiscardPhase } from '../../../logic/phases/discard';
import { drawCards, discardCards } from '../../../services/actions';

interface OnlineGameProps {
  enabledCardIds: string[];
  initialHp: number;
  initialHandSize: number;
  onExit: () => void;
}

export const OnlineGame: React.FC<OnlineGameProps> = ({ enabledCardIds, initialHp, initialHandSize, onExit }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const gameStateRef = useRef<GameState | null>(null);
  gameStateRef.current = gameState;
  
  // Network State
  const [peer, setPeer] = useState<Peer | null>(null);
  const [conn, setConn] = useState<DataConnection | null>(null);
  const [role, setRole] = useState<NetworkRole | null>(null);
  const roleRef = useRef<NetworkRole | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [networkLogs, setNetworkLogs] = useState<NetworkMessage[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  
  // Local UI State (Selection)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showMyDeck, setShowMyDeck] = useState(false);
  const [showMyDiscard, setShowMyDiscard] = useState(false);
  const [showVault, setShowVault] = useState(false);
  
  // Phase Lock to prevent double execution on Host
  const phaseLockRef = useRef(false);

  // --- NETWORK SETUP ---
  useEffect(() => {
      const newPeer = new Peer();
      newPeer.on('open', (id) => {
          setPeer(newPeer);
      });
      newPeer.on('connection', (connection) => {
          if (roleRef.current === 'HOST') {
              handleConnection(connection);
          } else {
              connection.close(); // Reject if we are not hosting or already connected?
          }
      });
      newPeer.on('error', (err) => {
          setConnectionError(err.type === 'peer-unavailable' ? "目标ID不存在或离线" : err.message);
          setIsConnecting(false);
      });
      return () => newPeer.destroy();
  }, []);

  const handleConnection = (connection: DataConnection) => {
      setConn(connection);
      setIsConnecting(false);
      
      connection.on('open', () => {
           // Connection established
           if (roleRef.current === 'HOST') {
               initializeGame();
           }
      });

      connection.on('data', (data: any) => {
          logNetwork(data, 'CLIENT'); // Received from Client (if I am Host) or Host (if I am Client)
          
          if (roleRef.current === 'HOST') {
               handleClientAction(data);
          } else {
               handleHostMessage(data);
          }
      });

      connection.on('close', () => {
          setConnectionError("连接已断开");
          setGameState(null);
          setConn(null);
      });
  };

  const connectToHost = (targetId: string) => {
      if (!peer) return;
      setIsConnecting(true);
      setConnectionError(null);
      setRole('CLIENT');
      roleRef.current = 'CLIENT';
      
      const connection = peer.connect(targetId);
      handleConnection(connection);
  };

  const createHost = () => {
      if (!peer) return;
      setRole('HOST');
      roleRef.current = 'HOST';
      setHostId(peer.id);
  };

  const sendMessage = (type: string, payload: any) => {
      if (!conn || !role) return;
      const msg = {
          id: `msg-${Date.now()}`,
          sender: role,
          type,
          payload,
          timestamp: Date.now()
      };
      conn.send(msg);
      logNetwork(msg, role); // Outgoing
  };

  const logNetwork = (msg: any, source: NetworkRole) => {
      setNetworkLogs(prev => [...prev.slice(-49), { ...msg, sender: source }]); // Keep last 50
  };

  // --- HOST LOGIC: GAME INITIALIZATION ---
  const initializeGame = () => {
      const definitions = CARD_DEFINITIONS.filter(c => enabledCardIds.includes(c.id));
      const p1Deck = shuffleDeck(generateDeck(1, definitions));
      const p2Deck = shuffleDeck(generateDeck(2, definitions));

      const initialPlayer = {
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
          maxHandSize: initialHandSize + 3,
          skipDiscardThisTurn: false,
          quests: [],
          swordsSunDamageMult: 1
      };

      const newState: GameState = {
        phase: GamePhase.DRAW,
        instantWindow: InstantWindow.NONE,
        turnCount: 1,
        player1: { id: 1, name: "Host (P1)", ...initialPlayer, deck: p1Deck, hand: p1Deck.splice(0, initialHandSize) },
        player2: { id: 2, name: "Client (P2)", ...initialPlayer, deck: p2Deck, hand: p2Deck.splice(0, initialHandSize) },
        playerReadyState: { 1: false, 2: false },
        field: null,
        logs: ["联机对战开始！"],
        isResolving: false,
        pendingEffects: [],
        activeEffect: null,
        interaction: null,
        visualEvents: []
      };

      setGameState(newState);
      broadcastState(newState);

      // Start Game Draw
      setTimeout(() => {
          executeDrawPhase({ 
              gameState: newState, 
              setGameState: updateAndBroadcast, 
              createEffectContext: (pid, c) => createEffectContext(pid, c, newState) 
          });
      }, 1000);
  };

  const updateAndBroadcast: React.Dispatch<React.SetStateAction<GameState | null>> = (value) => {
      setGameState(prev => {
          const next = typeof value === 'function' ? value(prev) : value;
          if (next && roleRef.current === 'HOST') {
               broadcastState(next);
          }
          return next;
      });
  };

  const broadcastState = (state: GameState) => {
      // Send Sanitized state to Client
      // We can send full state or delta. Full state is easier but heavy.
      // Optimize: Mask opponent hand/deck info if needed, but for simplicity we send all and UI hides it.
      // Actually, for anti-cheat, we should mask opponent hand.
      // But implementation complexity is high. Assuming "Trust" or simple UI hiding.
      // We rely on `sanitizeGameState` helper if it existed, or just send.
      const payload = sanitizeGameState(state);
      sendMessage('GAME_STATE_SYNC', payload);
  };

  // --- HOST LOGIC: ACTION HANDLING ---
  const handleClientAction = (msg: any) => {
      if (msg.type !== 'PLAYER_ACTION') return;
      const payload: GameActionPayload = msg.payload;
      const pid = 2; // Client is always Player 2

      processAction(pid, payload);
  };

  // Wrapper for Host to process local actions (Player 1)
  const handleLocalAction = (payload: GameActionPayload) => {
      processAction(1, payload);
  };

  const processAction = (pid: number, payload: GameActionPayload) => {
      const state = gameStateRef.current;
      if (!state) return;

      if (payload.actionType === 'TOGGLE_READY') {
          // Set Phase Confirm
          if (state.phase === GamePhase.SET) {
               updateAndBroadcast(prev => {
                   if (!prev) return null;
                   // Handle card selection logic here if payload has cardId?
                   // No, selection is separate. READY implies "I am done setting".
                   // But "Set Phase" logic requires a card to be selected in state?
                   // Wait, LocalGame logic sets `pSelectedCardId` in LOCAL state, then calls `executeSetPhase` with it.
                   // In Online, Host needs to know WHICH card Client selected.
                   // So 'TOGGLE_READY' should ideally carry the selected Card ID for Set Phase.
                   const cardId = payload.cardId;
                   if (cardId) {
                        // We store the intention to set this card? 
                        // `executeSetPhase` takes `p1SelectedCardId` and `p2SelectedCardId` as arguments.
                        // We need to store these selections in a transient state or execute immediately if waiting?
                        // Better: Store in `playerReadyState` logic or new field?
                        // Let's modify `executeSetPhase` call pattern.
                        // We will store the selected card in a temporary ref or extend GameState?
                        // GameState `playerReadyState` is just boolean.
                        // Let's add a "pendingSetCard" to GameState or handle it via a closure/ref on Host.
                        // Ref on host:
                   }
                   return {
                       ...prev,
                       playerReadyState: { ...prev.playerReadyState, [pid]: true }
                   };
               });
               
               // We need to capture the selected card ID for the phase execution.
               if (payload.cardId) {
                   if (pid === 1) p1SetCardRef.current = payload.cardId;
                   else p2SetCardRef.current = payload.cardId;
               }
          }
      } 
      else if (payload.actionType === 'USE_INSTANT') {
          const cardId = payload.cardId;
          if (cardId) {
              const p = pid === 1 ? state.player1 : state.player2;
              const card = p.hand.find(c => c.instanceId === cardId);
              if (card && card.onInstant) {
                   const ctx = createEffectContext(pid, card, state);
                   updateAndBroadcast(curr => curr ? ({...curr, logs: [`${p.name} 使用了插入：[${card.name}]`, ...curr.logs]}) : null);
                   card.onInstant(ctx);
                   discardCards(ctx, pid, [cardId]);
              }
          }
      }
      else if (payload.actionType === 'CONFIRM_INTERACTION') {
           // Handle Interaction inputs (Number, Card Select, Option)
           const interaction = state.interaction;
           if (interaction && interaction.playerId === pid) {
                // Execute callback
                // Since we serialized state, we lost the callback functions in `interaction`.
                // We must reconstruct or use an ID mapping.
                // Re-hydration issue: Host has full state with functions. Client has JSON.
                // Actions originating from Client must act on Host's state which HAS functions.
                // So this works fine on Host.
                
                if (payload.value !== undefined && interaction.onConfirm) {
                    interaction.onConfirm(payload.value);
                } else if (payload.cardId && interaction.onCardSelect) {
                    // Find card object
                    const p = pid === 1 ? state.player1 : state.player2;
                    // Search everywhere (hand, field, deck, discard)? 
                    // interaction.cardsToSelect holds the objects.
                    const target = interaction.cardsToSelect?.find(c => c.instanceId === payload.cardId);
                    if (target) interaction.onCardSelect(target);
                } else if (payload.optionIndex !== undefined && interaction.options) {
                    const opt = interaction.options[payload.optionIndex];
                    if (opt && opt.action) opt.action();
                }
           }
      }
      else if (payload.actionType === 'DISMISS_EFFECT') {
          // Dismiss active effect overlay
           updateAndBroadcast(prev => {
               if (!prev) return null;
               // Only dismiss if the effect belongs to this player? Or global?
               // Usually global overlay blocking. Either player can dismiss? 
               // Or usually it auto-dismisses or requires "Continue".
               // Let's allow either to continue for now or restrict to turn player.
               return { ...prev, activeEffect: null };
           });
      }
      else if (payload.actionType === 'DISCARD_CARD') {
          // Manual discard (Phase)
          if (payload.cardId && state.phase === GamePhase.DISCARD) {
              const ctx = createEffectContext(pid, { ...state.player1.hand[0] }, state); // Dummy card
              discardCards(ctx, pid, [payload.cardId]);
          }
      }
  };
  
  const p1SetCardRef = useRef<string | null>(null);
  const p2SetCardRef = useRef<string | null>(null);

  // --- CLIENT LOGIC ---
  const handleHostMessage = (msg: any) => {
      if (msg.type === 'GAME_STATE_SYNC') {
          // Hydrate logic to re-attach static definitions if needed (for rendering descriptions/tooltips correctly)
          const hydrated = hydrateGameState(msg.payload);
          setGameState(hydrated);
      }
  };

  // --- AUTOMATIC PHASE ADVANCEMENT (HOST) ---
  useEffect(() => {
      if (roleRef.current !== 'HOST' || !gameState) return;
      
      const { playerReadyState, isResolving, phase } = gameState;
      
      // Auto-advance if not resolving
      if (!isResolving && !phaseLockRef.current) {
          if (phase === GamePhase.SET && playerReadyState[1] && playerReadyState[2]) {
               phaseLockRef.current = true;
               // Execute Set
               executeSetPhase({ 
                   setGameState: updateAndBroadcast, 
                   p1SelectedCardId: p1SetCardRef.current, 
                   p2SelectedCardId: p2SetCardRef.current 
               });
               // Clear refs
               p1SetCardRef.current = null;
               p2SetCardRef.current = null;
               
               setTimeout(() => { phaseLockRef.current = false; }, 500);
          } 
          else if (phase === GamePhase.REVEAL && gameState.instantWindow === InstantWindow.BEFORE_REVEAL) {
               // Wait for manual "Reveal" click or auto?
               // Usually manual to allow Instants.
          }
          else if (phase === GamePhase.DISCARD) {
               executeDiscardPhase({ 
                   gameState, 
                   setGameState: updateAndBroadcast, 
                   createEffectContext: (pid, c) => createEffectContext(pid, c, gameState) 
               });
          }
      }

  }, [gameState?.playerReadyState, gameState?.isResolving, gameState?.phase]);

  // Helper: Create Context (Host Side)
  const createEffectContext = (pid: number, card: Card, currentGameState: GameState): EffectContext => ({
      gameState: currentGameState,
      sourcePlayerId: pid,
      card,
      setGameState: updateAndBroadcast,
      log: (msg) => updateAndBroadcast(prev => prev ? ({ ...prev, logs: [msg, ...prev.logs] }) : null),
      gameMode: 'ONLINE'
  });

  // --- UI HANDLERS ---
  const isMe = (pid: number) => (role === 'HOST' ? pid === 1 : pid === 2);
  const myPid = role === 'HOST' ? 1 : 2;
  const myPlayer = gameState ? (role === 'HOST' ? gameState.player1 : gameState.player2) : null;
  const oppPlayer = gameState ? (role === 'HOST' ? gameState.player2 : gameState.player1) : null;

  const handleCardClick = (card: Card) => {
      if (!gameState) return;
      setSelectedCardId(card.instanceId);
  };

  const handleSetConfirm = () => {
      if (!gameState || !selectedCardId) return;
      if (role === 'HOST') {
          handleLocalAction({ actionType: 'TOGGLE_READY', cardId: selectedCardId });
      } else {
          sendMessage('PLAYER_ACTION', { actionType: 'TOGGLE_READY', cardId: selectedCardId });
      }
      setSelectedCardId(null);
  };

  const handleInstant = () => {
      if (!gameState || !selectedCardId) return;
      if (role === 'HOST') {
          handleLocalAction({ actionType: 'USE_INSTANT', cardId: selectedCardId });
      } else {
          sendMessage('PLAYER_ACTION', { actionType: 'USE_INSTANT', cardId: selectedCardId });
      }
      setSelectedCardId(null);
  };

  const handleRevealClick = () => {
      if (role !== 'HOST') return; // Only host drives phase
      // Host manually triggers reveal
      executeFlipCards({ gameState: gameState!, setGameState: updateAndBroadcast, addLog: (m) => updateAndBroadcast(p=>p?({...p, logs:[m, ...p.logs]}):null) });
      setTimeout(() => {
           executeResolveEffects({
               gameStateRef: { current: gameState! }, // Ref might be stale, need live ref or pass state? executeResolveEffects uses ref.
               // We need to ensure we pass a ref that tracks CURRENT state during async ops.
               // In `LocalGame`, we used a ref updated on render.
               // Here, `gameStateRef` is updated on render.
               setGameState: updateAndBroadcast,
               addLog: (m) => updateAndBroadcast(p=>p?({...p, logs:[m, ...p.logs]}):null),
               createEffectContext: (pid, c) => createEffectContext(pid, c, gameStateRef.current!),
               triggerVisualEffect: async () => {}
           });
      }, 1000);
  };

  const handleDiscardClick = () => {
      // If phase is discard and we must discard, treat click as discard
      if (gameState?.phase === GamePhase.DISCARD && selectedCardId) {
           if (role === 'HOST') handleLocalAction({ actionType: 'DISCARD_CARD', cardId: selectedCardId });
           else sendMessage('PLAYER_ACTION', { actionType: 'DISCARD_CARD', cardId: selectedCardId });
           setSelectedCardId(null);
      }
  };

  // --- EFFECT QUEUE PROCESSOR (HOST) ---
  useEffect(() => {
    if (roleRef.current !== 'HOST' || !gameState) return;
    if (gameState.activeEffect || gameState.pendingEffects.length === 0) return;
    
    const nextEffect = gameState.pendingEffects[0];
    updateAndBroadcast(prev => {
        if(!prev) return null;
        return {
            ...prev,
            activeEffect: nextEffect,
            pendingEffects: prev.pendingEffects.slice(1)
        };
    });
  }, [gameState?.pendingEffects, gameState?.activeEffect]);


  // --- RENDER ---
  if (!conn || !gameState) {
      return (
          <ConnectionScreen 
              onCreateGame={createHost}
              onJoinGame={connectToHost}
              onBack={onExit}
              isConnecting={isConnecting}
              hostId={hostId}
              error={connectionError}
          />
      );
  }

  const myState = role === 'HOST' ? gameState.player1 : gameState.player2;
  const oppState = role === 'HOST' ? gameState.player2 : gameState.player1;

  // Interaction Wrapper for Client
  const handleInteraction = (type: string, val?: any) => {
      const payload: any = { actionType: 'CONFIRM_INTERACTION' };
      if (type === 'NUMBER') payload.value = val;
      if (type === 'CARD') payload.cardId = val.instanceId;
      if (type === 'OPTION') payload.optionIndex = val; // index
      
      if (role === 'HOST') handleLocalAction(payload);
      else sendMessage('PLAYER_ACTION', payload);
  };

  return (
    <div className="relative w-full h-screen bg-stone-950 overflow-hidden flex flex-col font-sans select-none">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>
        
        <PhaseBar currentPhase={gameState.phase} turn={gameState.turnCount} />

        <div className="flex-1 flex overflow-hidden relative">
            <GameLogSidebar logs={gameState.logs} currentPlayerId={myPid} />

            <div className="flex-1 flex flex-col relative">
                <VisualEffectsLayer events={gameState.visualEvents} onEventComplete={(id) => {
                     // Host cleans up
                     if(role==='HOST') updateAndBroadcast(p=>p?({...p, visualEvents: p.visualEvents.filter(e=>e.id!==id)}):null);
                }} />

                {/* Opponent Area */}
                <PlayerArea 
                    player={oppState} 
                    isOpponent={true} 
                    phase={gameState.phase}
                    selectedCardId={null}
                    mustDiscard={false} // Opponent discards logic handled by state flags mostly
                    canSet={false}
                    canInstant={false}
                    isResolving={gameState.isResolving}
                    instantWindow={gameState.instantWindow}
                    onSelect={() => {}}
                    onInstant={() => {}}
                    hideHand={true} // Hide opponent hand in online
                />

                <FieldArea gameState={gameState} player1={gameState.player1} player2={gameState.player2} />

                {/* Reveal Button (Host Only) */}
                {role === 'HOST' && gameState.phase === GamePhase.REVEAL && gameState.instantWindow === InstantWindow.BEFORE_REVEAL && !gameState.isResolving && (
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
                          <button onClick={handleRevealClick} className="bg-amber-600 px-8 py-3 rounded-full font-bold shadow-lg animate-pulse text-white">
                             ⚔️ 揭示卡牌 ⚔️
                          </button>
                     </div>
                )}
                {/* Client Waiting Message */}
                {role === 'CLIENT' && gameState.phase === GamePhase.REVEAL && gameState.instantWindow === InstantWindow.BEFORE_REVEAL && (
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 bg-black/50 px-4 py-2 rounded text-stone-300 text-sm">
                         等待主机揭示...
                     </div>
                )}

                {/* My Area */}
                <PlayerArea 
                    player={myState} 
                    isOpponent={false} 
                    phase={gameState.phase}
                    selectedCardId={selectedCardId}
                    mustDiscard={gameState.phase === GamePhase.DISCARD && myState.hand.length > myState.maxHandSize}
                    canSet={gameState.phase === GamePhase.SET && !gameState.playerReadyState[myPid]}
                    canInstant={gameState.instantWindow !== InstantWindow.NONE}
                    isResolving={gameState.isResolving}
                    instantWindow={gameState.instantWindow}
                    onSelect={handleCardClick}
                    onInstant={handleInstant}
                    onViewDeck={() => setShowMyDeck(true)}
                    onViewDiscard={() => setShowMyDiscard(true)}
                    onViewVault={() => setShowVault(true)}
                />

                {/* My Action Buttons */}
                <div className="absolute bottom-[28%] left-1/2 -translate-x-1/2 z-50 flex gap-4">
                    {gameState.phase === GamePhase.SET && !gameState.playerReadyState[myPid] && (
                         <button 
                            disabled={!selectedCardId && myState.hand.length > 0}
                            onClick={handleSetConfirm}
                            className="bg-emerald-700 hover:bg-emerald-600 text-white px-8 py-2 rounded-lg font-bold shadow-lg disabled:opacity-50"
                         >
                            确认盖牌
                         </button>
                    )}
                    
                    {gameState.phase === GamePhase.DISCARD && myState.hand.length > myState.maxHandSize && (
                         <button 
                            disabled={!selectedCardId}
                            onClick={handleDiscardClick}
                            className="bg-red-700 hover:bg-red-600 text-white px-8 py-2 rounded-lg font-bold shadow-lg disabled:opacity-50"
                         >
                            弃置选中
                         </button>
                    )}
                </div>

            </div>
        </div>

        {/* --- OVERLAYS --- */}
        {gameState.interaction && gameState.interaction.playerId === myPid && (
            <InteractionOverlay request={{
                ...gameState.interaction,
                onConfirm: (val) => handleInteraction('NUMBER', val),
                onCardSelect: (card) => handleInteraction('CARD', card),
                options: gameState.interaction.options?.map((opt, i) => ({
                    ...opt,
                    action: () => handleInteraction('OPTION', i)
                }))
            }} />
        )}
        
        {gameState.interaction && gameState.interaction.playerId !== myPid && (
             <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full z-[200]">
                 对方正在思考...
             </div>
        )}

        {gameState.activeEffect && (
            <EffectOverlay 
                effect={gameState.activeEffect} 
                onDismiss={() => {
                     if (role === 'HOST') handleLocalAction({ actionType: 'DISMISS_EFFECT' });
                     else sendMessage('PLAYER_ACTION', { actionType: 'DISMISS_EFFECT' });
                }} 
            />
        )}

        {gameState.phase === GamePhase.GAME_OVER && (
            <GameOverOverlay result={gameState.logs[0]} onRestart={onExit} />
        )}

        {showMyDeck && <CardPileOverlay title="我的牌堆" cards={myState.deck} sorted onClose={() => setShowMyDeck(false)} />}
        {showMyDiscard && <CardPileOverlay title="我的弃牌" cards={myState.discardPile} onClose={() => setShowMyDiscard(false)} />}
        {showVault && <CardPileOverlay title="宝库" cards={CARD_DEFINITIONS.filter(c=>c.isTreasure).map(d=>({...d, instanceId: d.id, marks: [], description: d.description||""}))} onClose={() => setShowVault(false)} />}

        {showDebug && <NetworkDebugOverlay logs={networkLogs} role={role} onSimulateReceive={()=>{}} onClearLogs={()=>setNetworkLogs([])} onClose={()=>setShowDebug(false)} />}
        
        <div className="absolute bottom-2 right-2 flex gap-2 z-50">
             <button onClick={() => setShowDebug(true)} className="bg-stone-800 text-stone-400 p-2 rounded-full hover:bg-stone-700 text-xs">📶</button>
        </div>
    </div>
  );
};
