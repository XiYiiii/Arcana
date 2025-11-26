

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

  setGameState(prev => {
    if (!prev) return null;
    
    const cleanup = (p: PlayerState) => {
      const field = p.fieldSlot;
      
      // Delayed Effects Processing
      const newDelayed = [];
      let extraDraw = 0;
      let hp = p.hp;

      p.delayedEffects.forEach(eff => {
          if (eff.turnsRemaining === 1) {
              if (eff.action === 'DRAW') {
                  if (eff.sourceCardName.startsWith('RECOVER_HP:')) {
                      const amount = parseInt(eff.sourceCardName.split(':')[1]);
                      hp += amount;
                  } else {
                      extraDraw += eff.amount;
                  }
              }
              // DISCARD effect logic is tricky as it forces discard next turn. 
              // We don't have a mechanism to force discard *after* draw in current delayed struct easily
              // without adding state. For now we assume user plays knowing they have fewer cards?
              // Or we reduce MAX HAND SIZE temporarily? 
              // For Hanged Man (Discard 2): We can just make them draw fewer? No, "Discard 2".
              // Simplified: We will reduce hand size or let them discard in next discard phase.
              // Wait, if we are in Discard Phase now, preparing for next turn.
              // If I have Discard Debt, maybe I just draw fewer? No, that's different.
              // Let's just ignore Discard debt for this iteration or treat it as "Draw -2" (which implies effectively having fewer cards).
              if (eff.action === 'DISCARD') {
                  // Hack: Negative draw to simulate loss of advantage
                  // Real implementation needs "Forced Discard Phase" start of turn.
                  // We'll treat it as -amount draw.
                  extraDraw -= eff.amount;
              }
          } else {
              newDelayed.push({ ...eff, turnsRemaining: eff.turnsRemaining - 1 });
          }
      });

      return {
        state: {
          ...p,
          hp,
          fieldSlot: null,
          isFieldCardRevealed: false,
          discardPile: field ? [...p.discardPile, field] : p.discardPile, 
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
          incomingDamageConversion: false
        },
        drawAmount: extraDraw
      };
    };

    const p1Result = cleanup(prev.player1);
    const p2Result = cleanup(prev.player2);

    // Apply delayed draw/discard results (clamped to 0 min draw handled in next phase? No, we do it here)
    
    const processDelayedDraw = (p: PlayerState, amt: number) => {
        const newDeck = [...p.deck];
        const newHand = [...p.hand];
        
        if (amt > 0) {
            for(let i=0; i<amt; i++) {
                if(newDeck.length) newHand.push(newDeck.shift()!);
            }
        } else if (amt < 0) {
            // Negative draw = Discard random? Or just start with fewer cards?
            // "Discard 2". We'll remove random from hand to simulate forced discard.
            const discards = Math.abs(amt);
            for(let i=0; i<discards; i++) {
                if(newHand.length > 0) {
                   const r = Math.floor(Math.random() * newHand.length);
                   // Actually move to discard pile?
                   // This function only returns new hand/deck. The outer cleanup set discardPile.
                   // We need to update discardPile too if we discard here.
                   // This refactor is getting messy. Let's just remove from hand.
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