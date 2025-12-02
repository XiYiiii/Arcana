
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

  const p1MustDiscard = player1.hand.length > player1.maxHandSize && !player1.skipDiscardThisTurn;
  const p2MustDiscard = player2.hand.length > player2.maxHandSize && !player2.skipDiscardThisTurn;

  if (p1MustDiscard || p2MustDiscard) return;

  setGameState((prev: any) => {
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

    // --- PENTACLES JUDGMENT FIELD LOGIC ---
    let judgmentDmgToP1 = 0;
    let judgmentDmgToP2 = 0;
    const field = prev.field;
    if (field && field.active && field.card.name.includes('星币·审判')) {
         const p1Taken = prev.player1.damageTakenThisTurn;
         const p2Taken = prev.player2.damageTakenThisTurn;
         
         if (p1Taken > p2Taken) {
             // P1 took more damage, takes P2's Atk as damage
             judgmentDmgToP1 = prev.player2.atk;
         } else if (p2Taken > p1Taken) {
             // P2 took more damage, takes P1's Atk as damage
             judgmentDmgToP2 = prev.player1.atk;
         }
    }
    // Apply judgment damage immediately to local state before cleanup
    if (judgmentDmgToP1 > 0) p1Processed.hp -= judgmentDmgToP1;
    if (judgmentDmgToP2 > 0) p2Processed.hp -= judgmentDmgToP2;

    const extraLogs = [];
    if (judgmentDmgToP1 > 0) extraLogs.push(`[场地] 星币·审判：P1 承受额外伤害 ${judgmentDmgToP1} 点！`);
    if (judgmentDmgToP2 > 0) extraLogs.push(`[场地] 星币·审判：P2 承受额外伤害 ${judgmentDmgToP2} 点！`);

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

      // Update Lock Status
      // If lockedTurns > 0, decrement it. If becomes 0, unlock.
      const updatedHand = p.hand.map(c => {
          if (c.isLocked) {
              const newDuration = (c.lockedTurns || 0) - 1;
              return { 
                  ...c, 
                  lockedTurns: newDuration, 
                  isLocked: newDuration > 0 // Only remains locked if duration > 0
              };
          }
          return c;
      });

      return {
        state: {
          ...p,
          hp,
          atk,
          hand: updatedHand, 
          fieldSlot: null,
          isFieldCardRevealed: false,
          discardPile: field && !field.isTreasure ? [...p.discardPile, field] : p.discardPile, 
          immunityThisTurn: p.immunityNextTurn,
          immunityNextTurn: false,
          isReversed: false,
          isInvalidated: false,
          hpRecoverNextTurn: 0,
          invalidateNextPlayedCard: p.invalidateNextPlayedCard || p.invalidateNextTurn, // Carry over current or apply new from "Next Turn"
          invalidateNextTurn: false, // Reset the "Next Turn" trigger
          delayedEffects: newDelayed,
          skipDiscardThisTurn: false,
          
          // Reset turn-based status flags
          preventHealing: false,
          hasLifesteal: false,
          damageReflection: false,
          incomingDamageConversion: false,
          swordsHangedManActive: false,
          
          // Reset damage trackers
          damageTakenThisTurn: 0,
          piercingDamageThisTurn: p.piercingDamageNextTurn, // Carry over next turn setting
          piercingDamageNextTurn: false,
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
       return { ...prev, phase: GamePhase.GAME_OVER, logs: [msg, ...prev.logs, ...extraLogs], player1: p1FinalState, player2: p2FinalState };
    }
    
    return {
      ...prev,
      phase: GamePhase.DRAW,
      instantWindow: InstantWindow.NONE,
      turnCount: prev.turnCount + 1,
      player1: p1FinalState,
      player2: p2FinalState,
      logs: [`--- 第 ${prev.turnCount + 1} 回合开始 ---`, ...extraLogs, ...prev.logs],
      // CRITICAL: Reset isResolving for the next turn loop
      isResolving: false,
      // IMPORTANT: Reset ready state for next turn
      playerReadyState: { 1: false, 2: false }
    };
  });
};
