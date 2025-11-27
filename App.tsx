

import React, { useState, useEffect, useRef } from 'react';
import { Card, GamePhase, InstantWindow, GameState, PlayerState, EffectContext, PendingEffect, Keyword, CardDefinition, ActionPayload, NetworkRole } from './types';
import { generateDeck, shuffleDeck } from './services/gameUtils';
import { drawCards, discardCards, getOpponentId, destroyCard, updateQuestProgress } from './services/actions'; 
import { MAX_HAND_SIZE, INITIAL_HP, INITIAL_ATK } from './constants';
import { CARD_DEFINITIONS } from './data/cards';
import { networkManager, serializeState } from './services/networkUtils';

import { PhaseBar } from './components/PhaseBar';
import { PlayerArea } from './components/PlayerArea';
import { FieldArea } from './components/FieldArea';
import { InteractionOverlay, EffectOverlay, GameOverOverlay, DebugOverlay, GalleryOverlay, CardPileOverlay } from './components/overlays';
import { VisualEffectsLayer } from './components/VisualEffectsLayer';
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
  
  // Network State
  const [netRole, setNetRole] = useState<NetworkRole>('NONE');
  const [localPlayerId, setLocalPlayerId] = useState<number>(0); // 0 = Both/Local, 1 = Host, 2 = Guest

  // Debug & UI State
  const [showDebug, setShowDebug] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  
  // Pile Viewer State
  const [viewingPile, setViewingPile] = useState<{ type: 'DISCARD' | 'DECK' | 'VAULT', pid: number, cards: Card[], title: string, sorted?: boolean } | null>(null);

  // Visual Effect Resolver
  const activeEffectResolverRef = useRef<(() => void) | null>(null);

  const gameStateRef = useRef<GameState | null>(null);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // --- NETWORK SYNC HANDLER ---
  useEffect(() => {
    // Attach listener to network manager
    networkManager.onData = (data: any) => {
        if (data.type === 'SYNC') {
            // Guest receives state
            setGameState(data.payload);
        } else if (data.type === 'REQUEST_SYNC') {
            // Host receives sync request from Guest (handshake)
            if (netRole === 'HOST' && gameStateRef.current) {
                networkManager.send({ type: 'SYNC', payload: serializeState(gameStateRef.current) });
            }
        } else if (data.type === 'ACTION') {
            // Host receives action
            if (netRole === 'HOST') {
                handleRemoteAction(data.payload);
            }
        }
    };

    // Handshake: If we are guest, request state immediately upon mounting/ready
    if (netRole === 'GUEST') {
        // Small delay to ensure connection is fully registered locally, though conn.open check inside send handles it.
        setTimeout(() => {
            networkManager.send({ type: 'REQUEST_SYNC' });
        }, 500);
    }
  }, [netRole]);

  // Host Broadcast
  useEffect(() => {
    if (netRole === 'HOST' && gameState) {
        networkManager.send({ type: 'SYNC', payload: serializeState(gameState) });
    }
  }, [gameState, netRole]);

  const sendAction = (type: ActionPayload['type'], data: any) => {
      networkManager.send({ type: 'ACTION', payload: { type, playerId: localPlayerId, data } });
  };

  const handleRemoteAction = (action: ActionPayload) => {
      if (!gameStateRef.current) return;
      const { playerId, data } = action;
      const player = playerId === 1 ? gameStateRef.current.player1 : gameStateRef.current.player2;

      switch (action.type) {
          case 'CLICK_CARD':
              {
                const card = player.hand.find((c: Card) => c.instanceId === data.cardId);
                if (card) handleCardClick(player, card);
              }
              break;
          case 'USE_INSTANT':
              handleInstantUse(player, data.cardId);
              break;
          case 'PHASE_ACTION':
              if (data.phase === 'DRAW') onDrawPhase();
              if (data.phase === 'SET') onSetPhase();
              if (data.phase === 'REVEAL') onFlip(); // Or Resolve
              if (data.phase === 'RESOLVE') onResolve();
              if (data.phase === 'DISCARD') onDiscard();
              break;
          case 'INTERACTION_OPTION':
              handleInteractionOption(data.index);
              break;
          case 'INTERACTION_NUMBER':
              handleInteractionConfirm(data.value);
              break;
          case 'INTERACTION_CARD':
              {
                  const req = gameStateRef.current.interaction;
                  if (req && req.cardsToSelect) {
                      const c = req.cardsToSelect[data.index]; // Guest sends index of card in selection array
                      if (c && req.onCardSelect) req.onCardSelect(c);
                  }
              }
              break;
      }
  };

  // --- INTERACTION HANDLING (LOCAL & REMOTE) ---
  const handleInteractionOption = (index: number) => {
      // Execute the function stored in state
      const req = gameStateRef.current?.interaction;
      if (req && req.options && req.options[index] && req.options[index].action) {
          req.options[index].action();
      }
  };
  
  const handleInteractionConfirm = (val: number) => {
      const req = gameStateRef.current?.interaction;
      if (req && req.onConfirm) {
          req.onConfirm(val);
      }
  }

  // --- Helper Wrapper for Context ---
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

  // --- Initialization ---
  const handleStartGame = (mode: 'LOCAL' | 'ONLINE_HOST' | 'ONLINE_GUEST') => {
      if (mode === 'LOCAL') {
          setNetRole('NONE');
          setLocalPlayerId(0);
          initGame();
      } else if (mode === 'ONLINE_HOST') {
          setNetRole('HOST');
          setLocalPlayerId(1);
          initGame(); // Host inits game
      } else {
          setNetRole('GUEST');
          setLocalPlayerId(2);
          setAppMode('GAME'); // Guest just goes to game screen, waits for Sync
      }
  };

  const initGame = () => {
      const allowedDefs = CARD_DEFINITIONS.filter(c => enabledCardIds.includes(c.id) || c.isTreasure);
      const finalDefs = allowedDefs.length < 10 ? CARD_DEFINITIONS : allowedDefs;
      if (allowedDefs.length < 10) console.warn("Selected deck too small, reverting to full deck.");

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

      setGameState({
        phase: GamePhase.DRAW,
        instantWindow: InstantWindow.NONE,
        turnCount: 1,
        logs: ["游戏开始。", `初始生命: ${initialHp}, 手牌: ${initialHandSize}`],
        player1: initialPlayerState(1, p1Deck, p1Hand),
        player2: initialPlayerState(2, p2Deck, p2Hand),
        field: null,
        isResolving: false,
        pendingEffects: [],
        activeEffect: null,
        interaction: null,
        visualEvents: []
      });
      setAppMode('GAME');
  };

  const handleSetupConfirm = (ids: string[], settings: { hp: number, handSize: number }) => {
      setEnabledCardIds(ids);
      setInitialHp(settings.hp);
      setInitialHandSize(settings.handSize);
      setAppMode('MENU');
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

  // --- Logic Hooks (Run only on Host or Local) ---
  const isLogicAuthoritative = netRole === 'NONE' || netRole === 'HOST';

  // --- Rule: Empty Hand Check ---
  useEffect(() => {
    if (appMode !== 'GAME' || !gameState || !isLogicAuthoritative) return;
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
    if (!gameState.isResolving && gameState.activeEffect === null && gameState.pendingEffects.length === 0 && gameState.interaction === null) {
        checkPlayer(1);
        checkPlayer(2);
    }
  }, [gameState?.player1.hand, gameState?.player2.hand, gameState?.isResolving, appMode]);

  // --- Quest Check ---
  useEffect(() => {
      if (appMode !== 'GAME' || !gameState || !isLogicAuthoritative) return;
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
    // Only Host handles effect queue
    if (appMode !== 'GAME' || !gameState || !isLogicAuthoritative) return;
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
         if (isLogicAuthoritative) {
             const effect = gameState.activeEffect;
             // Execute logic
             if (effect.type === 'ON_DRAW' && effect.card.onDraw) {
                effect.card.onDraw(createEffectContext(effect.playerId, effect.card));
             } else if (effect.type === 'ON_DISCARD' && effect.card.onDiscard) {
                effect.card.onDiscard(createEffectContext(effect.playerId, effect.card));
             }
             setGameState(prev => prev ? ({ ...prev, activeEffect: null }) : null);
         } else {
             // Guest logic: Do nothing? 
             // Actually, guest needs to wait for host sync to clear it?
             // Or guest dismisses local overlay visually, but state remains until sync?
             // Ideally Guest shouldn't have dismiss control if logic is waiting.
             // But Visual Overlay is blocking.
             // Let's assume Host syncs the 'activeEffect: null' state.
             // Guest dismiss just hides it locally? No, waiting for sync is better.
         }
         
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

  // --- Phase Handlers (Interception for Guest) ---
  const handlePhaseAction = (phaseName: string, action: () => void) => {
      if (netRole === 'GUEST') {
          sendAction('PHASE_ACTION', { phase: phaseName });
      } else {
          action();
      }
  };

  const onDrawPhase = () => handlePhaseAction('DRAW', () => executeDrawPhase({ gameState, setGameState, createEffectContext }));
  const onSetPhase = () => handlePhaseAction('SET', () => executeSetPhase({ setGameState, p1SelectedCardId, p2SelectedCardId, setP1SelectedCardId, setP2SelectedCardId }));
  const onFlip = () => handlePhaseAction('REVEAL', () => executeFlipCards({ gameState, setGameState, addLog, setP1SelectedCardId, setP2SelectedCardId }));
  const onResolve = () => handlePhaseAction('RESOLVE', () => executeResolveEffects({ gameStateRef, setGameState, addLog, createEffectContext, triggerVisualEffect }));
  const onDiscard = () => handlePhaseAction('DISCARD', () => executeDiscardPhase({ gameState, setGameState, createEffectContext }));

  // --- Interactions ---
  const handleCardClick = (player: PlayerState, card: Card) => {
    if (appMode !== 'GAME' || !gameState) return;
    
    // Guest Interceptor
    if (netRole === 'GUEST') {
        if (localPlayerId === player.id) {
            sendAction('CLICK_CARD', { cardId: card.instanceId });
        }
        return;
    }

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
    if (netRole === 'GUEST') {
        if (localPlayerId === player.id) {
            sendAction('USE_INSTANT', { cardId: cardInstanceId });
        }
        return;
    }

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

  // --- Overlay Interception (Guest) ---
  const handleOptionSelected = (index: number, val?: any) => {
      // index -1 = confirm number, -2 = card select
      if (netRole === 'GUEST') {
          if (index === -1) {
              sendAction('INTERACTION_NUMBER', { value: val });
          } else if (index === -2) {
              // val is index of card in the list
              sendAction('INTERACTION_CARD', { index: val });
          } else {
              sendAction('INTERACTION_OPTION', { index });
          }
      }
      // For Host/Local, the InteractionOverlay calls the functions directly via `request` prop,
      // so we don't need logic here, except if we want to centralize.
      // Currently `InteractionOverlay` handles Local logic inside it via `request` props.
      // We only pass `onOptionSelected` to handle the Guest case where `request` props are empty/stripped.
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

  // --- RENDER SWITCH ---
  if (appMode === 'MENU') {
      return <StartScreen onStartGame={handleStartGame} onOpenDeckBuilder={() => setAppMode('BUILDER')} />;
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
  if (!gameState) return <div className="bg-stone-900 h-screen text-stone-400 flex flex-col gap-4 items-center justify-center font-serif">
      <div className="text-2xl animate-pulse">Waiting for Host...</div>
      <button onClick={() => { networkManager.close(); setAppMode('MENU'); }} className="px-4 py-2 bg-stone-800 rounded">Cancel</button>
  </div>;

  const { phase, instantWindow, player1, player2, isResolving, activeEffect, interaction, field } = gameState;
  
  // VIEW ROTATION LOGIC
  // If I am Player 2 (Guest), show Player 2 at bottom (Main) and Player 1 at top (Opponent).
  // If I am Player 1 or Local, show Player 1 at bottom.
  const isP2View = localPlayerId === 2;
  const bottomPlayer = isP2View ? player2 : player1;
  const topPlayer = isP2View ? player1 : player2;
  const bottomSelId = isP2View ? p2SelectedCardId : p1SelectedCardId;
  const topSelId = isP2View ? p1SelectedCardId : p2SelectedCardId;
  const canSetBottom = isP2View ? (/* Logic for P2 */ true) : (/* Logic for P1 */ true); // Simplified calc below
  
  // Logic helpers adapted for View Rotation
  // We need to calculate canSet etc based on the *actual* ID, then assign to bottom/top vars
  const isSwordsStarActive = field?.active && field.card.name.includes('宝剑·星星');
  const isCardConditionLocked = (player: PlayerState, c: Card): boolean => {
      if (c.isLocked) return true; 
      if (c.isTreasure) return false;
      if (isSwordsStarActive && c.name.includes('太阳')) return false;
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

  const getCanSet = (p: PlayerState, selId: string | null) => {
      const sel = p.hand.find(c => c.instanceId === selId);
      return p.hand.length > 0 ? (sel && (sel.canSet !== false || (isSwordsStarActive && sel.name.includes('太阳'))) && !isCardConditionLocked(p, sel)) : true;
  };
  const getCanInstant = (p: PlayerState, selId: string | null) => {
      const sel = p.hand.find(c => c.instanceId === selId);
      return sel && sel.canInstant?.(instantWindow) && !sel.isLocked;
  };

  const canSetP1 = getCanSet(player1, p1SelectedCardId);
  const canSetP2 = getCanSet(player2, p2SelectedCardId);
  const canInstantP1 = getCanInstant(player1, p1SelectedCardId);
  const canInstantP2 = getCanInstant(player2, p2SelectedCardId);

  const canSetBottomVal = isP2View ? canSetP2 : canSetP1;
  const canInstantBottomVal = isP2View ? canInstantP2 : canInstantP1;
  const mustDiscardBottom = (bottomPlayer.hand.filter(c => !c.isTreasure).length > bottomPlayer.maxHandSize && !bottomPlayer.skipDiscardThisTurn);

  // Disable controls if not my turn/role
  // Local: Always enable. Host: Enable for P1. Guest: Enable for P2.
  const isMyControl = (pid: number) => localPlayerId === 0 || localPlayerId === pid;
  const disableBottom = !isMyControl(bottomPlayer.id);

  const getActionButton = () => {
    if (phase === GamePhase.GAME_OVER) {
        return <div className="text-2xl font-black text-red-600 animate-pulse font-serif">游戏结束</div>;
    }
    
    // Only show action button for the local player's relevant actions
    // If Online, only show if I am the one supposed to click (e.g. Draw Phase is auto/shared, but Set Phase requires button)
    // Draw Phase: usually auto or clicked by Host. Guest just waits?
    // Current Logic: onDrawPhase calls `drawCards` for both. Only Host needs to click.
    if (netRole === 'GUEST' && phase === GamePhase.DRAW) return <div className="text-stone-500">等待主机...</div>;
    
    const commonClasses = "w-full py-3 rounded-lg font-serif font-black text-lg tracking-widest shadow-md transition-all transform duration-200 border-b-4 active:border-b-0 active:translate-y-1";
    
    if (phase === GamePhase.DRAW) return <button onClick={onDrawPhase} className={`${commonClasses} bg-stone-700 hover:bg-stone-600 hover:shadow-stone-500/20 text-stone-200 border-stone-900`}>抽牌阶段</button>;
    
    if (phase === GamePhase.SET) {
       // Wait for both? In Local, button confirms for current turn logic.
       // The logic `executeSetPhase` checks selection state.
       // In P2P, we might want separate "Ready" states, but for now Plan 1: Host controls flow.
       // Host clicks "Confirm Set". Checks if valid.
       // Guest just selects card.
       // Host needs to see if Guest has selected? 
       // Current `executeSetPhase` consumes selection.
       // We need P2 to have selected something (if hand > 0).
       
       const ready = !!canSetP1 && !!canSetP2;
       // If Guest: Show "Waiting" if I selected, or "Select Card".
       // Actually Guest has no button in this architecture unless we change Set Phase to independent ready.
       // Let's keep it simple: Host button triggers phase change.
       if (netRole === 'GUEST') return <div className="text-stone-500">{p2SelectedCardId ? "等待主机确认..." : "请选择盖牌"}</div>;

       return <button onClick={onSetPhase} disabled={!ready} className={`${commonClasses} ${!ready ? 'bg-stone-800 border-stone-900 text-stone-600 cursor-not-allowed' : 'bg-emerald-800 hover:bg-emerald-700 text-emerald-100 border-emerald-950 shadow-emerald-900/30'}`}>确认盖牌</button>;
    }
    
    if (phase === GamePhase.REVEAL) {
       if (netRole === 'GUEST') return <div className="text-stone-500">等待主机结算...</div>;

       if (instantWindow === InstantWindow.BEFORE_REVEAL) return <button onClick={onFlip} className={`${commonClasses} bg-amber-800 hover:bg-amber-700 text-amber-100 border-amber-950 shadow-amber-900/30`}>揭示卡牌</button>;
       if (instantWindow === InstantWindow.AFTER_REVEAL) return <button onClick={onResolve} className={`${commonClasses} bg-indigo-900 hover:bg-indigo-800 text-indigo-100 border-black shadow-indigo-900/30`}>结算效果</button>;
       return <button className={`${commonClasses} bg-stone-800 text-stone-500 border-stone-950`} disabled>结算中...</button>;
    }
    
    if (phase === GamePhase.DISCARD) {
        // Each player clicks discard individually? 
        // Logic `onDiscard` ends turn if conditions met.
        // If I am Guest, I click to discard *my* cards via card click.
        // The button "End Turn" checks if *both* satisfy conditions.
        // If Guest, button is "Wait"?
        // Or if Guest needs to discard, they just click cards.
        
        const myHandCount = bottomPlayer.hand.filter(c => !c.isTreasure).length;
        const iMustDiscard = myHandCount > bottomPlayer.maxHandSize && !bottomPlayer.skipDiscardThisTurn;
        
        if (iMustDiscard) return <div className="text-red-400 font-bold animate-pulse">请弃置手牌 ({myHandCount - bottomPlayer.maxHandSize}张)</div>;
        
        if (netRole === 'GUEST') return <div className="text-stone-500">等待回合结束...</div>;

        const p1HandCount = player1.hand.filter(c => !c.isTreasure).length;
        const p1MustDiscard = p1HandCount > player1.maxHandSize && !player1.skipDiscardThisTurn;

        const p2HandCount = player2.hand.filter(c => !c.isTreasure).length;
        const p2MustDiscard = p2HandCount > player2.maxHandSize && !player2.skipDiscardThisTurn;
        
        const disabled = p1MustDiscard || p2MustDiscard;
        return <button onClick={onDiscard} disabled={disabled} className={`${commonClasses} ${disabled ? 'bg-stone-800 text-red-400 border-stone-950' : 'bg-stone-700 hover:bg-stone-600 text-stone-200 border-stone-900'}`}>{disabled ? "等待弃牌..." : "结束回合"}</button>;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-stone-900 flex flex-col font-sans text-stone-300 overflow-hidden selection:bg-amber-900/50 relative">
      
      {/* Unified Background */}
      <div className="absolute inset-0 bg-stone-900 z-0"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(28,25,23,0)_0%,_rgba(0,0,0,0.5)_100%)] z-0 pointer-events-none"></div>
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] z-0"></div>
      
      {/* Visual Effects Layer */}
      <VisualEffectsLayer events={gameState.visualEvents} onEventComplete={handleVisualEventComplete} />

      {/* Top Bar */}
      <div className="absolute top-4 right-4 z-50 flex gap-3">
         <button 
           onClick={() => { networkManager.close(); setAppMode('MENU'); }} 
           className="text-[10px] bg-stone-900/60 text-red-400 hover:text-red-300 px-3 py-2 rounded border border-red-900/30 backdrop-blur"
         >
           退出游戏
         </button>
         <button 
           onClick={() => setShowGallery(!showGallery)} 
           className="text-[10px] font-serif font-bold bg-stone-900/60 text-amber-600 hover:text-amber-500 px-4 py-2 rounded border border-amber-900/30 backdrop-blur transition-all hover:shadow-[0_0_15px_rgba(180,83,9,0.2)]"
         >
           📖 图鉴
         </button>
         {localPlayerId === 0 && (
             <button 
               onClick={() => setShowDebug(!showDebug)} 
               className="text-[10px] bg-stone-900/60 text-stone-600 hover:text-stone-400 px-3 py-2 rounded border border-stone-800 backdrop-blur"
             >
               调试
             </button>
         )}
      </div>

      {showGallery && <GalleryOverlay onClose={() => setShowGallery(false)} />}
      
      {viewingPile && (
          <CardPileOverlay 
              title={viewingPile.title} 
              cards={viewingPile.cards} 
              onClose={() => setViewingPile(null)} 
              sorted={viewingPile.sorted}
          />
      )}

      {showDebug && (
          <DebugOverlay 
             gameState={gameState} 
             setGameState={setGameState} 
             createEffectContext={createEffectContext} 
             onClose={() => setShowDebug(false)} 
          />
      )}

      {phase === GamePhase.GAME_OVER && <GameOverOverlay result={gameState.logs[0]} onRestart={() => setAppMode('MENU')} />}
      
      {activeEffect && (
          // Guest should allow dismissal? 
          // If Guest has the effect active, they should be able to dismiss to clear view, 
          // BUT syncing state might bring it back.
          // Host controls flow. We let Guest dismiss locally but state sync might override.
          <EffectOverlay 
              effect={activeEffect} 
              onDismiss={isLogicAuthoritative ? dismissActiveEffect : undefined} 
          />
      )}
      
      {/* Interaction Overlay - Special Guest Handling */}
      {interaction && (
          <InteractionOverlay 
              request={interaction} 
              onOptionSelected={handleOptionSelected}
          />
      )}

      <PhaseBar currentPhase={phase} turn={gameState.turnCount} />
      
      {/* Status Ticker */}
      <div className="bg-stone-900/80 backdrop-blur text-center text-[10px] py-1.5 border-b border-stone-800/50 shadow-lg relative z-30 flex justify-between px-4">
         <div>
             <span className="text-amber-700 font-bold tracking-wider uppercase mr-2">状态:</span>
             <span className="text-stone-400 font-serif">
                {instantWindow === InstantWindow.NONE ? '等待中...' : 
                 instantWindow === InstantWindow.BEFORE_SET ? '置牌前时机' :
                 instantWindow === InstantWindow.BEFORE_REVEAL ? '亮牌前时机' :
                 instantWindow === InstantWindow.AFTER_REVEAL ? '亮牌后时机' : '结算中...'}
             </span>
             {gameState.field && (
                 <span className="ml-4 text-emerald-500 font-serif font-bold">
                     🏟️ 场地: {gameState.field.card.name} (P{gameState.field.ownerId})
                 </span>
             )}
         </div>
         <div className="text-stone-600 font-mono">
             {localPlayerId !== 0 && `YOU: P${localPlayerId}`} {netRole !== 'NONE' && `[${netRole}]`}
         </div>
      </div>

      {isResolving && !activeEffect && !interaction && (
         <div className="absolute inset-0 z-[45] flex items-center justify-center pointer-events-none">
            <div className="bg-black/70 text-amber-500 px-8 py-4 rounded-xl text-lg font-serif font-bold shadow-2xl backdrop-blur-md border border-amber-900/30 animate-pulse">
               处理中...
            </div>
         </div>
      )}

      <div className="flex-grow flex flex-col relative overflow-hidden z-10">
        
        {/* TOP PLAYER (Opponent from perspective of Bottom) */}
        <PlayerArea 
          player={topPlayer} 
          isOpponent={true} // Always visual opponent at top
          phase={phase} 
          selectedCardId={topSelId} 
          mustDiscard={false} // Opponent UI usually doesn't show discard prompt aggressively
          canSet={false} 
          canInstant={false} // Can't interact with top player
          isResolving={isResolving} 
          instantWindow={instantWindow}
          onSelect={(c) => {}} // Can't select opponent cards usually (except inspect? Disabled for now)
          onInstant={() => {}}
          onViewDiscard={() => openPileView('DISCARD', topPlayer.id)}
          onViewDeck={() => openPileView('DECK', topPlayer.id)}
          onViewVault={() => openPileView('VAULT', topPlayer.id)}
        />
        
        <FieldArea gameState={gameState} player1={player1} player2={player2} />

        {/* BOTTOM PLAYER (Self) */}
        <PlayerArea 
          player={bottomPlayer} 
          phase={phase} 
          selectedCardId={bottomSelId} 
          mustDiscard={mustDiscardBottom}
          canSet={!!canSetBottomVal && !disableBottom} 
          canInstant={!!canInstantBottomVal && !disableBottom} 
          isResolving={isResolving} 
          instantWindow={instantWindow}
          onSelect={(c) => !disableBottom && handleCardClick(bottomPlayer, c)} 
          onInstant={(id) => !disableBottom && handleInstantUse(bottomPlayer, id)}
          onViewDiscard={() => openPileView('DISCARD', bottomPlayer.id)}
          onViewDeck={() => openPileView('DECK', bottomPlayer.id)}
          onViewVault={() => openPileView('VAULT', bottomPlayer.id)}
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