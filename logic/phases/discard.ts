
import { GamePhase, InstantWindow, PlayerState } from '../../types';

export const executeDiscardPhase = (
  ctx: { 
    gameState: any, 
    setGameState: any,
    createEffectContext: any 
  }
) => {
  const { gameState, setGameState, createEffectContext } = ctx;
  if (!gameState) return;
  const { player1, player2 } = gameState;

  // --- Pentacles Lovers Check (End of End Phase Trigger) ---
  const checkLovers = (p: PlayerState) => {
      const lovers = p.hand.filter(c => c.name.includes('星币·恋人'));
      lovers.forEach(lover => {
           // If Opponent has NO marked card
           const oppId = p.id === 1 ? 2 : 1;
           const opp = oppId === 1 ? gameState.player1 : gameState.player2;
           const hasMark = opp.hand.some(c => c.marks.includes('mark-pentacles-lovers'));
           
           if (!hasMark) {
               // Discard this card
               const context = createEffectContext(p.id, lover);
               // We use a manual state update to avoid complex action recursion in this phase function, 
               // but actions.ts logic (onDiscard hook) needs to trigger if present. 
               // Pentacles Lovers has no OnDiscard. Safe to just move.
               // Actually we should log it.
               if(createEffectContext) context.log(`[星币·恋人] 孤单离场。`);
               // We will filter it out in the cleanup below naturally if we add logic, 
               // but better to flag it for removal or modify hand now.
               // Modifying state here is tricky because we are about to calculate Discard logic.
               // Let's modify the `hand` passed to the logic below.
               const idx = p.hand.indexOf(lover);
               if(idx > -1) {
                   p.hand.splice(idx, 1);
                   p.discardPile.push(lover);
               }
           }
      });
  };
  // We need to work on copies or modify state before calculations.
  // Since `player1` and `player2` are const refs from state, we shouldn't mutate them directly.
  // But wait, the existing code below uses them to calculate `p1MustDiscard`.
  // Ideally we should do this check *after* discard phase completes? 
  // Prompt says: "After End Phase Ends". `DISCARD` IS the End Phase here.
  // So we should do this check at the very end of `executeDiscardPhase` or before `p1MustDiscard` check?
  // If we discard it, it frees up hand space.
  // Let's clone state first.
  
  // Implementation note: Direct mutation of the local `player1/2` variables won't affect state unless we setGameState.
  // But we use `setGameState` at the end.
  // Let's create a "Pre-cleanup" effect.
  
  // Actually, React state immutability. We can't mutate `player1`.
  // We'll skip implementing it *inside* this function's logic flow for now to avoid breaking the "Must Discard" check.
  // Instead, we will assume "End of End Phase" means the transition to DRAW.
  // So inside the final `setGameState`.

  const p1MustDiscard = player1.hand.length > player1.maxHandSize && !player1.skipDiscardThisTurn;
  const p2MustDiscard = player2.hand.length > player2.maxHandSize && !player2.skipDiscardThisTurn;

  if (p1MustDiscard || p2MustDiscard) return;

  setGameState(prev => {
    if (!prev) return null;
    
    // Function to apply "End Phase" Logic
    const processEndPhase = (p: PlayerState, opp: PlayerState) => {
        let hand = [...p.hand];
        let discard = [...p.discardPile];

        // Pentacles Lovers Logic
        const lovers = hand.filter(c => c.name.includes('星币·恋人'));
        lovers.forEach(lover => {
            const hasMark = opp.hand.some(c => c.marks.includes('mark-pentacles-lovers'));
            if (!hasMark) {
                 hand = hand.filter(c => c.instanceId !== lover.instanceId);
                 discard.push(lover);
            }
        });

        return { ...p, hand, discardPile: discard };
    }

    const p1Processed = processEndPhase(prev.player1, prev.player2);
    const p2Processed = processEndPhase(prev.player2, prev.player1);

    const cleanup = (p: PlayerState) => {
      const field = p.fieldSlot;
      
      // Delayed Effects Processing
      const newDelayed = [];
      let extraDraw = 0;
      let hp = p.hp;
      let atk = p.atk;

      p.delayedEffects.forEach(eff => {
          if (eff.turnsRemaining === 1) {
              if (eff.action === 'DRAW') {
                  if (eff.sourceCardName.startsWith('RECOVER_HP:')) {
                      const amount = parseInt(eff.sourceCardName.split(':')[1]);
                      hp += amount;
                  } else {
                      extraDraw += eff.amount;
                  }
              } else if (eff.action === 'DISCARD') {
                  extraDraw -= eff.amount;
              } else if (eff.action === 'ATK_CHANGE') {
                  atk += eff.amount;
              }
          } else {
              newDelayed.push({ ...eff, turnsRemaining: eff.turnsRemaining - 1 });
          }
      });

      // Reset Locked Status on all cards in hand
      const unlockedHand = p.hand.map(c => ({ ...c, isLocked: false }));

      return {
        state: {
          ...p,
          hp,
          atk,
          hand: unlockedHand, // Apply unlocked hand
          fieldSlot: null,
          isFieldCardRevealed: false,
          discardPile: field && !field.isTreasure ? [...p.discardPile, field] : p.discardPile, 
          immunityThisTurn: p.immunityNextTurn,
          immunityNextTurn: false,
          isReversed: false,
          isInvalidated: false,
          hpRecoverNextTurn: 0,
          invalidateNextPlayedCard: p.invalidateNextPlayedCard, 
          delayedEffects: newDelayed,
          skipDiscardThisTurn: false,
          
          // Reset turn-based status flags
          preventHealing: false,
          hasLifesteal: false,
          damageReflection: false,
          incomingDamageConversion: false,
          swordsHangedManActive: false,
        },
        drawAmount: extraDraw
      };
    };

    const p1Result = cleanup(p1Processed);
    const p2Result = cleanup(p2Processed);

    const processDelayedDraw = (p: PlayerState, amt: number) => {
        const newDeck = [...p.deck];
        const newHand = [...p.hand];
        
        if (amt > 0) {
            for(let i=0; i<amt; i++) {
                if(newDeck.length) newHand.push(newDeck.shift()!);
            }
        } else if (amt < 0) {
            const discards = Math.abs(amt);
            for(let i=0; i<discards; i++) {
                if(newHand.length > 0) {
                   const r = Math.floor(Math.random() * newHand.length);
                   newHand.splice(r, 1);
                }
            }
        }
        
        return { ...p, deck: newDeck, hand: newHand };
    }

    const p1FinalState = processDelayedDraw(p1Result.state, p1Result.drawAmount);
    const p2FinalState = processDelayedDraw(p2Result.state, p2Result.drawAmount);

    if (p1FinalState.hp < 0 || p2FinalState.hp < 0) {
       let msg = p1FinalState.hp < 0 && p2FinalState.hp < 0 ? "双方平局！" : p1FinalState.hp < 0 ? "玩家 2 获胜！" : "玩家 1 获胜！";
       return { ...prev, phase: GamePhase.GAME_OVER, logs: [msg, ...prev.logs], player1: p1FinalState, player2: p2FinalState };
    }
    
    return {
      ...prev,
      phase: GamePhase.DRAW,
      instantWindow: InstantWindow.NONE,
      turnCount: prev.turnCount + 1,
      player1: p1FinalState,
      player2: p2FinalState,
      logs: [`--- 第 ${prev.turnCount + 1} 回合开始 ---`, ...prev.logs]
    };
  });
};
