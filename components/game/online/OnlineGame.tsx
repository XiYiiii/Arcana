
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

  // --- Rule: Empty Hand Check (Host Only) ---
  useEffect(() => {
      if (roleRef.current !== 'HOST' || !gameState) return;
      
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

  const handleInstantUseLogic = async (player: PlayerState, cardInstanceId: string | null) => {
      if (!cardInstanceId || !gameStateRef.current) return;
      const gs = gameStateRef.current;
      const card = player.hand.find(c => c.instanceId === cardInstanceId);
      
      if (!card || !card.onInstant) return;
      if (card.isLocked) return; 
      if (card.canInstant && !card.canInstant(gs.instantWindow)) return;

      const oppId = getOpponentId(player.id);
      const opp = oppId === 1 ? gs.player1 : gs.player2;
      const moon = opp.hand.find(c => c.name.includes('月亮') && c.suit === 'WANDS');

      if (moon && !card.isTreasure) {
          // Interrupt Logic
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
      // 1. Show Visual
      setGameState(prev => prev ? ({ ...prev, isResolving: true }) : null);
      await triggerVisualEffect('INSTANT', card, player.id, "发动插入特效！");
      
      // 2. Execute Logic
      card.onInstant && card.onInstant(createEffectContext(player.id, card));
      
      // 3. Consume Card (if applicable, e.g. discard after use unless specified otherwise)
      // NOTE: Most instants remain in hand until discarded later or have custom discard logic in their onInstant (like Cups World).
      // Standard rule: Instants are played from hand and go to discard pile.
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

      // Cleanup selections
      setP1SelectedCardId(null);
      p2SelectedCardIdRef.current = null;
      setP2SelectedCardId(null);
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
                  // Allow voluntary discard (Removed check)
                  if (role === 'HOST') {
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
         
         // Allow voluntary discard
         if (role === 'HOST') {
             const ctx = createEffectContext(player.id, card);
             discardCards(ctx, player.id, [card.instanceId]);
         } else {
             sendNetworkMessage('PLAYER_ACTION', { actionType: 'DISCARD_CARD', cardId: card.instanceId });
         }
         return;
    }

    if (gameState?.phase === GamePhase.SET || gameState?.instantWindow !== InstantWindow.NONE) {
        if (role === 'HOST') {
            setP1SelectedCardId(card.instanceId === p1SelectedCardId ? null : card.instanceId);
        } else {
            // Client: Update local feedback selection AND notify Host
            const newId = card.instanceId === p2SelectedCardId ? null : card.instanceId;
            setP2SelectedCardId(newId);
            sendNetworkMessage('PLAYER_ACTION', { actionType: 'UPDATE_SELECTION', cardId: newId });
        }
    }
  };

  const handleInstantUse = (player: PlayerState, cardInstanceId: string | null) => {
      const myId = role === 'HOST' ? 1 : 2;
      if (player.id !== myId) return;
      if (!cardInstanceId) return;

      const card = player.hand.find(c => c.instanceId === cardInstanceId);
      if (!card) return;

      // Basic Client Validation
      if (card.isLocked) return;
      if (card.canInstant && !card.canInstant(gameState!.instantWindow)) return;

      if (role === 'HOST') {
          handleInstantUseLogic(player, cardInstanceId);
      } else {
          sendNetworkMessage('PLAYER_ACTION', { actionType: 'USE_INSTANT', cardId: cardInstanceId });
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

  const getActionButton = () => {
    if (!gameState) return null;
    const { phase, instantWindow, player1, player2, field } = gameState;
    const myId = role === 'HOST' ? 1 : 2;
    const me = myId === 1 ? player1 : player2;
    const isMyReady = gameState.playerReadyState[myId];
    
    // Define locally for use in canSet check
    const isSwordsStarActive = field?.active && field.card.name.includes('宝剑·星星');

    if (phase === GamePhase.GAME_OVER) {
        return <div className="text-2xl font-black text-red-600 animate-pulse font-serif">游戏结束</div>;
    }

    const commonClasses = "w-full py-3 rounded-lg font-serif font-black text-lg tracking-widest shadow-md transition-all transform duration-200 border-b-4 active:border-b-0 active:translate-y-1";
    const readyClasses = isMyReady 
        ? "bg-stone-800 text-stone-500 border-stone-950 cursor-not-allowed" 
        : "bg-stone-700 hover:bg-stone-600 text-stone-200 border-stone-900";

    const onAction = () => {
        if (role === 'HOST') {
            handleToggleReady(1);
        } else {
            sendNetworkMessage('PLAYER_ACTION', { actionType: 'TOGGLE_READY' });
        }
    };

    if (phase === GamePhase.DRAW) return <button onClick={onAction} disabled={isMyReady} className={`${commonClasses} ${readyClasses}`}>{isMyReady ? "等待对手..." : "抽牌阶段 (准备)"}</button>;
    
    if (phase === GamePhase.SET) {
       const mySelection = myId === 1 ? p1SelectedCardId : p2SelectedCardId;
       const selectedCard = me.hand.find(c => c.instanceId === mySelection);
       
       // Check validity using isSwordsStarActive
       const canSet = me.hand.length > 0 ? (selectedCard && (selectedCard.canSet !== false || (isSwordsStarActive && selectedCard.name.includes('太阳'))) && !isCardConditionLocked(me, selectedCard)) : true;
       
       const disabled = isMyReady || !canSet;
       
       return <button onClick={onAction} disabled={disabled} className={`${commonClasses} ${disabled ? 'bg-stone-800 border-stone-900 text-stone-600 cursor-not-allowed' : 'bg-emerald-800 hover:bg-emerald-700 text-emerald-100 border-emerald-950 shadow-emerald-900/30'}`}>{isMyReady ? "等待对手..." : "确认盖牌"}</button>;
    }
    
    if (phase === GamePhase.REVEAL) {
       if (instantWindow === InstantWindow.BEFORE_REVEAL) return <button onClick={onAction} disabled={isMyReady} className={`${commonClasses} ${isMyReady ? 'bg-stone-800 text-stone-500' : 'bg-amber-800 hover:bg-amber-700 text-amber-100 border-amber-950 shadow-amber-900/30'}`}>{isMyReady ? "等待对手..." : "揭示卡牌"}</button>;
       if (instantWindow === InstantWindow.AFTER_REVEAL) return <button onClick={onAction} disabled={isMyReady} className={`${commonClasses} ${isMyReady ? 'bg-stone-800 text-stone-500' : 'bg-indigo-900 hover:bg-indigo-800 text-indigo-100 border-black shadow-indigo-900/30'}`}>{isMyReady ? "等待对手..." : "结算效果"}</button>;
       return <button className={`${commonClasses} bg-stone-800 text-stone-500 border-stone-950`} disabled>结算中...</button>;
    }
    
    if (phase === GamePhase.DISCARD) {
       const handCount = me.hand.filter(c => !c.isTreasure).length;
       const mustDiscard = handCount > me.maxHandSize && !me.skipDiscardThisTurn;
       const disabled = mustDiscard || isMyReady;
       return <button onClick={onAction} disabled={disabled} className={`${commonClasses} ${disabled ? 'bg-stone-800 text-stone-600 border-stone-950' : 'bg-stone-700 hover:bg-stone-600 text-stone-200 border-stone-900'}`}>{mustDiscard ? "请先弃牌" : (isMyReady ? "等待对手..." : "结束回合")}</button>;
    }
    return null;
  };

  // --- Interaction Wrapper ---
  // Wraps user inputs to send network message if Client
  const networkInteractionProxy = (request: InteractionRequest | null): InteractionRequest | null => {
      if (!request) return null;
      const myId = role === 'HOST' ? 1 : 2;
      
      // If not my interaction, show it but read-only (optional, or just hide controls)
      // Usually interaction is modal for the specific player.
      if (request.playerId !== myId) return null; // Or show "Waiting for opponent..."

      if (role === 'HOST') return request;

      // CLIENT PROXY
      return {
          ...request,
          onConfirm: (val) => sendNetworkMessage('PLAYER_ACTION', { actionType: 'CONFIRM_INTERACTION', value: val }),
          onCardSelect: (card) => sendNetworkMessage('PLAYER_ACTION', { actionType: 'CONFIRM_INTERACTION', cardId: card.instanceId }),
          options: request.options?.map((opt, idx) => ({
              ...opt,
              action: () => sendNetworkMessage('PLAYER_ACTION', { actionType: 'CONFIRM_INTERACTION', optionIndex: idx })
          }))
      };
  };

  // --- RENDER ---

  if (connState === 'IDLE' || connState === 'CONNECTING' || (connState === 'HOSTING' && !gameState)) {
      return (
          <ConnectionScreen 
              onCreateGame={startHosting}
              onJoinGame={joinGame}
              onBack={onExit}
              isConnecting={connState === 'CONNECTING'}
              hostId={myPeerId}
              error={networkError}
          />
      );
  }

  if (!gameState) return <div className="bg-stone-900 h-screen text-stone-400 flex items-center justify-center font-serif">Loading Game State...</div>;

  const { phase, instantWindow, player1, player2, isResolving, activeEffect, interaction, field } = gameState;
  const myId = role === 'HOST' ? 1 : 2;
  const me = myId === 1 ? player1 : player2;
  const opp = myId === 1 ? player2 : player1;
  const mySelection = myId === 1 ? p1SelectedCardId : p2SelectedCardId;
  
  const myHandCount = me.hand.filter(c => !c.isTreasure).length;
  const myMustDiscard = myHandCount > me.maxHandSize && !me.skipDiscardThisTurn;
  
  // Define isSwordsStarActive for render scope validation
  const isSwordsStarActive = field?.active && field.card.name.includes('宝剑·星星');

  // Local Validation for UI Enablement
  const mySelectedCard = me.hand.find(c => c.instanceId === mySelection);
  const canSet = me.hand.length > 0 ? (mySelectedCard && (mySelectedCard.canSet !== false || (isSwordsStarActive && mySelectedCard.name.includes('太阳'))) && !isCardConditionLocked(me, mySelectedCard)) : true;
  const canInstant = mySelectedCard && mySelectedCard.canInstant?.(instantWindow) && !mySelectedCard.isLocked;

  // Render Interaction: If it's mine, show it. If opponent's, maybe show wait?
  const visibleInteraction = interaction && interaction.playerId === myId ? networkInteractionProxy(interaction) : null;

  return (
    <div className="h-screen bg-stone-900 flex flex-row font-sans text-stone-300 overflow-hidden selection:bg-amber-900/50 relative">
      
      {/* Sidebar: Show Logs - Hide opponent private info */}
      <GameLogSidebar logs={gameState.logs} currentPlayerId={myId} />

      {/* Main Area */}
      <div className="flex-1 flex flex-col relative h-full overflow-hidden">
          <div className="absolute inset-0 bg-stone-900 z-0"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(28,25,23,0)_0%,_rgba(0,0,0,0.5)_100%)] z-0 pointer-events-none"></div>
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] z-0"></div>
          
          <VisualEffectsLayer events={gameState.visualEvents} onEventComplete={handleVisualEventComplete} />

          {/* Top Bar */}
          <div className="absolute top-4 right-4 z-50 flex gap-3">
             <button onClick={onExit} className="text-[10px] bg-red-900/40 text-red-300 px-3 py-2 rounded border border-red-900/30 backdrop-blur">退出</button>
             <button onClick={() => setShowGallery(!showGallery)} className="text-[10px] font-bold bg-stone-900/60 text-amber-600 border border-amber-900/30 px-4 py-2 rounded backdrop-blur">📖 图鉴</button>
             <button onClick={() => setShowNetworkDebug(!showNetworkDebug)} className="text-[10px] bg-stone-900/60 text-emerald-500 border border-emerald-900/30 px-3 py-2 rounded backdrop-blur">📶 网络: {connState}</button>
          </div>

          {showGallery && <GalleryOverlay onClose={() => setShowGallery(false)} />}
          {viewingPile && <CardPileOverlay title={viewingPile.title} cards={viewingPile.cards} onClose={() => setViewingPile(null)} sorted={viewingPile.sorted} />}
          
          {showNetworkDebug && (
              <NetworkDebugOverlay 
                  logs={networkLogs} 
                  role={role} 
                  onSimulateReceive={() => {}} 
                  onClearLogs={() => setNetworkLogs([])} 
                  onClose={() => setShowNetworkDebug(false)} 
              />
          )}

          {phase === GamePhase.GAME_OVER && <GameOverOverlay result={gameState.logs[0]} onRestart={onExit} />}
          
          {/* Active Effect Overlay - Supports Dismissal via Network */}
          {activeEffect && (
              <EffectOverlay 
                  effect={activeEffect} 
                  onDismiss={interaction ? undefined : handleDismissEffect} // Hide dismiss if there's an interaction on top (rare)
              />
          )}
          
          {visibleInteraction && <InteractionOverlay request={visibleInteraction} />}
          
          {interaction && interaction.playerId !== myId && !activeEffect && (
              <div className="absolute inset-0 z-[45] flex items-center justify-center pointer-events-none">
                  <div className="bg-black/60 text-stone-400 px-6 py-3 rounded-xl border border-stone-700 backdrop-blur-sm animate-pulse">
                      等待对手操作...
                  </div>
              </div>
          )}

          <PhaseBar currentPhase={phase} turn={gameState.turnCount} />
          
          {/* Status */}
          <div className="bg-stone-900/80 backdrop-blur text-center text-[10px] py-1.5 border-b border-stone-800/50 shadow-lg relative z-30">
             <span className="text-amber-700 font-bold tracking-wider uppercase mr-2">状态:</span>
             <span className="text-stone-400 font-serif">
                {instantWindow === InstantWindow.NONE ? '等待中...' : 
                 instantWindow === InstantWindow.BEFORE_SET ? '置牌前时机' :
                 instantWindow === InstantWindow.BEFORE_REVEAL ? '亮牌前时机' :
                 instantWindow === InstantWindow.AFTER_REVEAL ? '亮牌后时机' : '结算中...'}
             </span>
             {gameState.field && <span className="ml-4 text-emerald-500 font-serif font-bold">🏟️ 场地: {gameState.field.card.name}</span>}
             <span className="ml-4 text-xs font-bold text-indigo-400">[联机: {role === 'HOST' ? '主机' : '客户端'}]</span>
          </div>

          <div className="flex-grow flex flex-col relative overflow-hidden z-10">
            {/* OPPONENT AREA (Top) */}
            <PlayerArea 
              player={opp} 
              isOpponent={true} 
              phase={phase} 
              selectedCardId={null} // Don't show opp selection
              mustDiscard={false} // Managed by them
              canSet={false} 
              canInstant={false} 
              isResolving={isResolving} 
              instantWindow={instantWindow}
              onSelect={() => {}} 
              onInstant={() => {}}
              onViewDiscard={() => openPileView('DISCARD', opp.id)}
              onViewDeck={() => openPileView('DECK', opp.id)} // View local version of their deck? Deck is hidden info usually. Host sees true deck. Client sees ?
              onViewVault={() => openPileView('VAULT', opp.id)}
              enableControls={false}
              hideHand={true} // Force hide opponent hand in online mode
            />
            
            <FieldArea gameState={gameState} player1={player1} player2={player2} />

            {/* MY AREA (Bottom) */}
            <PlayerArea 
              player={me} 
              phase={phase} 
              selectedCardId={mySelection} 
              mustDiscard={myMustDiscard}
              canSet={canSet} 
              canInstant={!!canInstant} 
              isResolving={isResolving} 
              instantWindow={instantWindow}
              onSelect={(c) => handleCardClick(me, c)} 
              onInstant={(id) => handleInstantUse(me, id)}
              onViewDiscard={() => openPileView('DISCARD', me.id)}
              onViewDeck={() => openPileView('DECK', me.id)}
              onViewVault={() => openPileView('VAULT', me.id)}
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
