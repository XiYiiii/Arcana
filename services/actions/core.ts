
import { EffectContext, PlayerState } from '../../types';
import { getTargetId, checkPentaclesWheelActivation } from './utils';

export const modifyPlayer = (
  ctx: EffectContext, 
  targetId: number, 
  mod: (p: PlayerState) => PlayerState
) => {
  const finalTargetId = getTargetId(ctx, targetId);
  
  ctx.setGameState(prev => {
    if (!prev) return null;
    const key = finalTargetId === 1 ? 'player1' : 'player2';
    const currentState = prev[key];
    
    // Apply Modification
    let newState = mod(currentState);

    // Rule: Prevent Healing if flag is set
    if (currentState.preventHealing && newState.hp > currentState.hp) {
        ctx.log(`[禁疗] ${currentState.name} 无法恢复生命！`);
        newState.hp = currentState.hp;
    }

    // Passive: Wands Priestess (Double Heal & Discard Self)
    if (newState.hp > currentState.hp) {
        const priestessIndex = newState.hand.findIndex(c => c.name.includes('权杖·女祭司'));
        if (priestessIndex !== -1) {
            const healAmount = newState.hp - currentState.hp;
            ctx.log(`[权杖·女祭司] 被动触发！治疗量翻倍 (+${healAmount} -> +${healAmount * 2}) 并弃置自身。`);
            
            // Apply doubled healing
            newState.hp = currentState.hp + (healAmount * 2);
            
            // Discard the priestess
            const priestessCard = newState.hand[priestessIndex];
            const newHand = [...newState.hand];
            newHand.splice(priestessIndex, 1);
            newState.hand = newHand;
            newState.discardPile = [...newState.discardPile, priestessCard];
        }
    }
    
    const intermediateState = {
      ...prev,
      [key]: newState
    };

    // Check Field Activation after stats change
    return checkPentaclesWheelActivation(intermediateState);
  });
};
