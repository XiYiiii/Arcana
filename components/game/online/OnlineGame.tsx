
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
  
  // --- Network State ---
  const [role, setRole] = useState<NetworkRole>('HOST'); 
  const [connState, setConnState] = useState<ConnectionState>('IDLE');
  const [myPeerId, setMyPeerId] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  
  const [networkLogs, setNetworkLogs] = useState<NetworkMessage[]>([]);
  const [showNetworkDebug, setShowNetworkDebug] = useState(false);

  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);

  // --- Refs for Stale Closure Prevention ---
  const gameStateRef = useRef<GameState | null>(null);
  const roleRef = useRef<NetworkRole>('HOST');
  
  // Sync Refs
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { roleRef.current = role; }, [role]);

  // --- Local Selection State ---
  // Host needs Refs to access latest values inside async/event closures without stale state
  const p2SelectedCardIdRef = useRef<string | null>(null);
  const [p1SelectedCardId, setP1SelectedCardId] = useState<string | null>(null);
  const [p2SelectedCardId, setP2SelectedCardId] = useState<string | null>(null); // For UI Sync
  
  // Phase Processing Lock (Prevents double execution)
  const phaseLockRef = useRef(false);

  // UI State
  const [showGallery, setShowGallery] = useState(false);
  const [viewingPile, setViewingPile] = useState<{ type: 'DISCARD' | 'DECK' | 'VAULT', pid: number, cards: Card[], title: string, sorted?: boolean } | null>(null);

  // Visual Effect Resolver
  const activeEffectResolverRef = useRef<(() => void) | null>(null);

  // --- Cleanup on Unmount ---
  useEffect(() => {
      return () => {
          if (connRef.current) connRef.current.close();
          if (peerRef.current) peerRef.current.destroy();
      };
  }, []);

  // --- Initial Game Setup Logic ---
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

      const safePayload = type === 'GAME_STATE_SYNC' ? sanitizeGameState(payload) : payload;

      const msg: NetworkMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          sender: roleRef.current,
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

  // IMPORTANT: This ref holds the LATEST processing function to avoid closure staleness in event listeners
  const processGameActionRef = useRef<(pid: number, action: GameActionPayload) => void>(() => {});

  const handleDataReceive = useCallback((data: any) => {
      const msg = data as NetworkMessage;
      addNetworkLog({ ...msg, id: `recv-${msg.id}` });

      if (roleRef.current === 'HOST') {
          if (msg.type === 'PLAYER_ACTION') {
              const action = msg.payload as GameActionPayload;
              // Always call the ref to get the latest closure
              processGameActionRef.current(2, action); 
          }
      } else {
          if (msg.type === 'GAME_STATE_SYNC') {
              const syncedState = hydrateGameState(msg.payload);
              setGameState(syncedState);
          }
      }
  }, []);

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
          
          if (roleRef.current === 'HOST') {
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

  // Host Sync Loop
  useEffect(() => {
      if (role === 'HOST' && connState === 'CONNECTED' && gameState) {
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

  // --- Core Game Logic (Host) ---

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
       isReversed: p?.isReversed,
       gameMode: 'ONLINE' // Explicitly set mode
     };
  };

  const handleToggleReady = (pid: number) => {
      setGameState(prev => {
          if (!prev) return null;
          // Just toggle Ready State here. 
          // Phase advancement is now handled by the useEffect watching this state.
          const currentReady = prev.playerReadyState[pid];
          const nextReadyState = { ...prev.playerReadyState, [pid]: !currentReady };
          return { ...prev, playerReadyState: nextReadyState };
      });
  };

  // --- Automatic Phase Advancement ---
  // Detects when both players are ready and advances. Protected by phaseLockRef to prevent double execution.
  useEffect(() => {
      if (roleRef.current !== 'HOST' || !gameState) return;
      const { playerReadyState, isResolving } = gameState;
      
      // If both ready AND not already resolving AND not locked
      if (playerReadyState[1] && playerReadyState[2] && !isResolving && !phaseLockRef.current) {
          phaseLockRef.current = true;
          advancePhase(gameState);
          
          // Release lock after a safety delay (state update is async)
          setTimeout(() => { phaseLockRef.current = false; }, 500);
      }
  }, [gameState?.playerReadyState, gameState?.isResolving]);

  // --- Effect Queue Processor (HOST ONLY) ---
  // Triggers when pendingEffects has items. Pops the first one and makes it active.
  useEffect(() => {
    if (roleRef.current !== 'HOST' || !gameState) return;
    // Don't pop if already showing something
    if (gameState.activeEffect || gameState.interaction) return;
    // Don't pop if empty
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

  const advancePhase = (currentState: GameState) => {
      console.log("[HOST] Advancing Phase logic triggered.");
      
      // ATOMIC UPDATE: Reset Ready AND Set resolving to avoid UI flickering for client
      setGameState(prev => prev ? ({ 
          ...prev, 
          isResolving: true, // Lock client UI
          playerReadyState: { 1: false, 2: false } 
      }) : null);

      const gs = gameStateRef.current || currentState;

      // Execute Phase Logic
      if (gs.phase === GamePhase.DRAW) {
          executeDrawPhase({ gameState: gs, setGameState, createEffectContext });
      } 
      else if (gs.phase === GamePhase.SET) {
          executeSetPhase({ 
              setGameState, 
              p1SelectedCardId, 
              p2SelectedCardId: p2SelectedCardIdRef.current,
          });
          // CLEANUP: Reset selections explicitly after consuming them
          setP1SelectedCardId(null);
          p2SelectedCardIdRef.current = null;
          setP2SelectedCardId(null);
      }
      else if (gs.phase === GamePhase.REVEAL) {
          if (gs.instantWindow === InstantWindow.BEFORE_REVEAL) {
              executeFlipCards({ gameState: gs, setGameState, addLog });
              // CLEANUP
              setP1SelectedCardId(null);
              p2SelectedCardIdRef.current = null;
              setP2SelectedCardId(null);
          } else if (gs.instantWindow === InstantWindow.AFTER_REVEAL) {
              executeResolveEffects({ gameStateRef, setGameState, addLog, createEffectContext, triggerVisualEffect });
          }
      }
      else if (gs.phase === GamePhase.DISCARD) {
          executeDiscardPhase({ gameState: gs, setGameState, createEffectContext });
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
  const dismissActiveEffectHost = () => {
     if (roleRef.current !== 'HOST' || !gameStateRef.current?.activeEffect) return;
     
     const effect = gameStateRef.current.activeEffect;
     
     // 1. Execute Logic
     if (effect.type === 'ON_DRAW' && effect.card.onDraw) {
        effect.card.onDraw(createEffectContext(effect.playerId, effect.card));
     } else if (effect.type === 'ON_DISCARD' && effect.card.onDiscard) {
        effect.card.onDiscard(createEffectContext(effect.playerId, effect.card));
     }

     // 2. Clear Effect State
     setGameState(prev => prev ? ({ ...prev, activeEffect: null }) : null);
     
     // 3. Resolve visual promise if any (for non-queue effects)
     if (activeEffectResolverRef.current) {
         activeEffectResolverRef.current();
         activeEffectResolverRef.current = null;
     }
  };

  const handleDismissEffect = () => {
      if (role === 'HOST') {
          dismissActiveEffectHost();
      } else {
          sendNetworkMessage('PLAYER_ACTION', { actionType: 'DISMISS_EFFECT' });
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

  // --- Host Processing Logic (Ref Updated) ---
  const processGameAction = (playerId: number, action: GameActionPayload) => {
      if (!gameStateRef.current) return;
      const gs = gameStateRef.current;
      const player = playerId === 1 ? gs.player1 : gs.player2;

      if (action.actionType === 'UPDATE_SELECTION') {
          if (playerId === 2) {
              p2SelectedCardIdRef.current = action.cardId || null;
              setP2SelectedCardId(action.cardId || null);
          }
      }
      else if (action.actionType === 'DISCARD_CARD' && action.cardId) {
          if (gs.phase === GamePhase.DISCARD) {
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
      else if (action.actionType === 'DISMISS_EFFECT') {
          dismissActiveEffectHost();
      }
      else if (action.actionType === 'CONFIRM_INTERACTION') {
          const interaction = gs.interaction;
          // Ensure the interaction exists and belongs to the requesting player
          if (interaction && interaction.playerId === playerId) {
              // 1. Button/Option Selection
              if (action.optionIndex !== undefined && interaction.options && interaction.options[action.optionIndex]) {
                  interaction.options[action.optionIndex].action();
              }
              // 2. Number Input
              else if (action.value !== undefined && interaction.onConfirm) {
                  interaction.onConfirm(action.value);
              }
              // 3. Card Selection
              else if (action.cardId && interaction.onCardSelect) {
                  // Find the card object (usually from hand or deck/pile as defined by context)
                  // For simplicity, we search in likely places: Hand, Field, Deck, Discard
                  const findCard = (cid: string) => {
                      const p = playerId === 1 ? gs.player1 : gs.player2;
                      const opp = playerId === 1 ? gs.player2 : gs.player1;
                      const all = [...p.hand, ...p.deck, ...p.discardPile, ...(p.fieldSlot?[p.fieldSlot]:[]), 
                                   ...opp.hand, ...opp.deck, ...opp.discardPile, ...(opp.fieldSlot?[opp.fieldSlot]:[])];
                      return all.find(c => c.instanceId === cid);
                  }
                  
                  const targetCard = findCard(action.cardId);
                  if (targetCard) {
                      interaction.onCardSelect(targetCard);
                  }
              }
          }
      }
  };

  // Keep the ref updated with the latest function closure
  useEffect(() => {
      processGameActionRef.current = processGameAction;
  }, [gameState, p1SelectedCardId, p2SelectedCardId]); // Deps needed to refresh closure

  // --- Interaction Validation Helpers ---
  const isCardConditionLocked = (player: PlayerState, c: Card): boolean => {
      // Logic copied from LocalGame to ensure consistent validation
      if (c.isLocked) return true; // Base lock
      if (c.isTreasure) return false;

      // Swords Star Field Logic
      if (gameState?.field?.active && gameState.field.card.name.includes('宝剑·星星') && c.name.includes('太阳')) return false;

      const lovers = player.hand.filter(x => x.marks.includes('mark-lovers') || x.marks.includes('mark-swords-lovers'));
      const justice = player.hand.find(x => x.marks.includes('mark-justice'));
      const wandsJustice = player.hand.find(x => x.marks.includes('mark-wands-justice'));
      
      const swordsLoversCount = player.hand.filter(x => x.marks.includes('mark-swords-lovers')).length;
      const hasWandsLoversPair = player.hand.filter(x => x.marks.includes('mark-lovers')).length >= 2;
      const hasJustice = !!justice;
      const hasWandsJustice = !!wandsJustice;

      if (hasWandsLoversPair && c.marks.includes('mark-lovers')) return true;
      if (c.marks.includes('mark-swords-lovers') && swordsLoversCount >= 2) return true;
      if (hasJustice && !c.marks.includes('mark-justice')) return true;
      if (hasWandsJustice && !c.marks.includes('mark-wands-justice')) return true;
      if (c.marks.includes('mark-sun')) return true;
      
      return false;
  };

  // --- Interactions ---
  const handleCardClick = (player: PlayerState, card: Card) => {
    const myId = role === 'HOST' ? 1 : 2;
    if (player.id !== myId) return;
    if (!gameState) return;
    if (gameState?.isResolving || gameState?.phase === GamePhase.GAME_OVER) return;

    // Discard Phase Logic (Explicit Action)
    if (gameState.phase === GamePhase.DISCARD) {
         if (card.isTreasure) {
             if(role === 'HOST') addLog(`[规则] 宝藏牌无法被弃置！`);
             return;
         }
         
         const handCount = player.hand.filter(c => !c.isTreasure).length;
         if (handCount > player.maxHandSize && !player.skipDiscardThisTurn) {
             if (role === 'HOST') {
                 const ctx = createEffectContext(player.id, card);
                 discardCards(ctx, player.id, [card.instanceId]);
             } else {
                 sendNetworkMessage('PLAYER_ACTION', { actionType: 'DISCARD_CARD', cardId: card.instanceId });
             }
         }
         return; 
    }

    // Standard Selection Logic (Set/Instant)
    let newSelectionId: string | null = null;
    if (myId === 1) {
        newSelectionId = card.instanceId === p1SelectedCardId ? null : card.instanceId;
        setP1SelectedCardId(newSelectionId);
    } else {
        newSelectionId = card.instanceId === p2SelectedCardId ? null : card.instanceId;
        setP2SelectedCardId(newSelectionId);
    }

    if (role === 'CLIENT') {
        sendNetworkMessage('PLAYER_ACTION', { actionType: 'UPDATE_SELECTION', cardId: newSelectionId });
    }
  };

  const handleInstantUse = (cardInstanceId: string) => {
      if (role === 'HOST') {
          if (!gameState) return;
          handleInstantUseLogic(gameState.player1, cardInstanceId);
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

  const handleReadyClick = () => {
      if (role === 'HOST') {
          handleToggleReady(1);
      } else {
          sendNetworkMessage('PLAYER_ACTION', { actionType: 'TOGGLE_READY' });
      }
  };

  if (connState !== 'CONNECTED' || !gameState) {
      return <ConnectionScreen onCreateGame={startHosting} onJoinGame={joinGame} onBack={onExit} isConnecting={connState === 'CONNECTING' || connState === 'HOSTING'} hostId={myPeerId} error={networkError} />;
  }

  const { phase, instantWindow, player1, player2, isResolving, activeEffect, interaction, playerReadyState, field } = gameState;
  const myId = role === 'HOST' ? 1 : 2;
  const myPlayer = myId === 1 ? player1 : player2;
  const oppPlayer = myId === 1 ? player2 : player1;
  const mySelectionId = myId === 1 ? p1SelectedCardId : p2SelectedCardId;
  const myReady = playerReadyState[myId];
  const oppReady = playerReadyState[myId === 1 ? 2 : 1];

  // Dynamic Validation for My Player
  const isSwordsStarActive = field?.active && field.card.name.includes('宝剑·星星');
  const mySelCard = myPlayer.hand.find(c => c.instanceId === mySelectionId);
  
  const canSetMy = myPlayer.hand.length > 0 
      ? (mySelCard && (mySelCard.canSet !== false || (isSwordsStarActive && mySelCard.name.includes('太阳'))) && !isCardConditionLocked(myPlayer, mySelCard)) 
      : true; // Empty hand allows set (logic handles empty)

  const canInstantMy = mySelCard && mySelCard.canInstant?.(instantWindow) && !mySelCard.isLocked;

  const isActionDisabled = () => {
      if (phase === GamePhase.SET) return myPlayer.hand.length > 0 && (!mySelectionId || !canSetMy); // Must select valid card
      if (phase === GamePhase.DISCARD) return myPlayer.hand.filter(c=>!c.isTreasure).length > myPlayer.maxHandSize && !myPlayer.skipDiscardThisTurn;
      return false;
  };

  // Only show interaction overlay if it is FOR ME
  const showInteraction = interaction && interaction.playerId === myId;

  // --- Render Proxy Interaction for Client ---
  let renderedInteraction = interaction;
  
  if (role === 'CLIENT' && interaction) {
      // Reconstruct action handlers that send network messages
      renderedInteraction = {
          ...interaction,
          onConfirm: (val: number) => {
              sendNetworkMessage('PLAYER_ACTION', { actionType: 'CONFIRM_INTERACTION', value: val });
          },
          onCardSelect: (card: Card) => {
              sendNetworkMessage('PLAYER_ACTION', { actionType: 'CONFIRM_INTERACTION', cardId: card.instanceId });
          },
          options: interaction.options?.map((opt, idx) => ({
              ...opt,
              action: () => {
                  sendNetworkMessage('PLAYER_ACTION', { actionType: 'CONFIRM_INTERACTION', optionIndex: idx });
              }
          }))
      };
  }

  const getActionButton = () => {
    if (phase === GamePhase.GAME_OVER) return <div className="text-2xl font-black text-red-600 animate-pulse font-serif">游戏结束</div>;
    
    // Check if opponent is interacting (Blocking Logic)
    if (interaction && interaction.playerId !== myId) {
        return <div className="text-amber-500 font-bold animate-pulse text-lg">对手正在抉择...</div>;
    }

    if (myReady && !oppReady) {
        return (
            <div className="flex flex-col items-center gap-2 w-full">
                <button onClick={handleReadyClick} className="w-full py-3 rounded-lg font-serif font-black text-lg tracking-widest shadow-md transition-all border-b-4 bg-emerald-800 text-emerald-200 border-emerald-950 active:translate-y-1 active:border-b-0 hover:bg-emerald-700">
                    已准备 (取消)
                </button>
                <span className="text-[10px] text-stone-500 animate-pulse">等待对方...</span>
            </div>
        );
    }

    if (isResolving || (myReady && oppReady)) {
        return <div className="text-emerald-500 font-bold animate-pulse text-lg">处理中...</div>;
    }

    const disabled = isActionDisabled();
    return (
        <button onClick={handleReadyClick} disabled={disabled} className={`w-full py-3 rounded-lg font-serif font-black text-lg tracking-widest shadow-md transition-all transform duration-200 border-b-4 active:border-b-0 active:translate-y-1 ${disabled ? "bg-stone-800 border-stone-900 text-stone-600 cursor-not-allowed" : "bg-stone-700 hover:bg-stone-600 hover:shadow-stone-500/20 text-stone-200 border-stone-900"}`}>
            {phase === GamePhase.SET && disabled ? "请先盖牌" : phase === GamePhase.DISCARD && disabled ? "请先弃牌" : "准备 (Ready)"}
        </button>
    );
  };

  return (
    <div className="min-h-screen bg-stone-900 flex flex-row font-sans text-stone-300 overflow-hidden selection:bg-amber-900/50 relative">
      
      {/* LEFT SIDEBAR - LOGS - PASS CURRENT ID FOR ONLINE MODE */}
      <GameLogSidebar logs={gameState.logs} currentPlayerId={myId} />

      {/* RIGHT - MAIN GAME AREA */}
      <div className="flex-1 flex flex-col relative h-screen overflow-hidden">
          {/* Unified Background */}
          <div className="absolute inset-0 bg-stone-900 z-0"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(28,25,23,0)_0%,_rgba(0,0,0,0.5)_100%)] z-0 pointer-events-none"></div>
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] z-0"></div>
          
          {/* Visual Effects Layer */}
          <VisualEffectsLayer events={gameState.visualEvents} onEventComplete={handleVisualEventComplete} />

          {/* Top Bar */}
          <div className="absolute top-4 right-4 z-50 flex gap-3">
             <div className="flex items-center gap-2 px-3 py-2 bg-stone-900/60 rounded border border-stone-800 backdrop-blur text-[10px]">
                 <span className={`w-2 h-2 rounded-full ${connState==='CONNECTED'?'bg-emerald-500':'bg-red-500'}`}></span>
                 <span className="text-stone-400 font-bold">{role === 'HOST' ? '主机' : '客机'}</span>
             </div>
             <button onClick={onExit} className="text-[10px] bg-stone-900/60 text-red-400 hover:text-red-300 px-3 py-2 rounded border border-red-900/30 backdrop-blur">退出</button>
             <button onClick={() => setShowNetworkDebug(!showNetworkDebug)} className="text-[10px] bg-stone-900/60 text-stone-600 hover:text-stone-400 px-3 py-2 rounded border border-stone-800 backdrop-blur">网络调试</button>
          </div>

          {showNetworkDebug && (
              <NetworkDebugOverlay 
                  logs={networkLogs} 
                  role={role} 
                  onSimulateReceive={() => {}} 
                  onClearLogs={() => setNetworkLogs([])} 
                  onClose={() => setShowNetworkDebug(false)}
              />
          )}

          {showGallery && <GalleryOverlay onClose={() => setShowGallery(false)} />}
          
          {viewingPile && (
              <CardPileOverlay 
                  title={viewingPile.title} 
                  cards={viewingPile.cards} 
                  onClose={() => setViewingPile(null)} 
                  sorted={viewingPile.sorted}
              />
          )}

          {phase === GamePhase.GAME_OVER && <GameOverOverlay result={gameState.logs[0]} onRestart={onExit} />}
          {activeEffect && <EffectOverlay effect={activeEffect} onDismiss={handleDismissEffect} />}
          {showInteraction && <InteractionOverlay request={renderedInteraction!} />}

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
             {gameState.field && (
                 <span className={`ml-4 font-serif font-bold ${gameState.field.active ? 'text-emerald-500' : 'text-stone-500'}`}>
                     🏟️ 场地: {gameState.field.card.name} (P{gameState.field.ownerId})
                 </span>
             )}
             <span className="ml-4 text-xs font-bold text-stone-600">[联机模式 - {role === 'HOST' ? '主机' : '客户端'}]</span>
          </div>

          <div className="flex-grow flex flex-col relative overflow-hidden z-10">
            <PlayerArea 
              player={oppPlayer} isOpponent phase={phase} 
              selectedCardId={null} mustDiscard={false}
              canSet={false} canInstant={false} isResolving={isResolving} instantWindow={instantWindow}
              onSelect={(c) => handleCardClick(oppPlayer, c)} onInstant={(id) => {}}
              onViewDiscard={() => openPileView('DISCARD', myId === 1 ? 2 : 1)}
              onViewDeck={() => openPileView('DECK', myId === 1 ? 2 : 1)}
              onViewVault={() => openPileView('VAULT', myId === 1 ? 2 : 1)}
              hideHand={true} // Hide opponent's hand in online mode
            />
            
            <FieldArea gameState={gameState} player1={player1} player2={player2} />

            <PlayerArea 
              player={myPlayer} phase={phase} 
              selectedCardId={mySelectionId} mustDiscard={myPlayer.hand.filter(c => !c.isTreasure).length > myPlayer.maxHandSize && !myPlayer.skipDiscardThisTurn}
              canSet={canSetMy} canInstant={!!canInstantMy} isResolving={isResolving} instantWindow={instantWindow}
              onSelect={(c) => handleCardClick(myPlayer, c)} onInstant={(id) => handleInstantUse(id)}
              onViewDiscard={() => openPileView('DISCARD', myId)}
              onViewDeck={() => openPileView('DECK', myId)}
              onViewVault={() => openPileView('VAULT', myId)}
              hideHand={false} // Show my hand
            />
          </div>

          {/* Bottom Action Panel - Modified to remove logs */}
          <div className="bg-stone-900/80 backdrop-blur-md border-t border-stone-800/50 p-4 flex justify-center items-center h-24 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-30 relative shrink-0">
             <div className="w-full max-w-sm flex items-center justify-center">
                {getActionButton()}
             </div>
          </div>
      </div>
    </div>
  );
}
