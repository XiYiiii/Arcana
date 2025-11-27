
import { GameState, PlayerState, EffectContext, Card } from '../../types';

export const getOpponentId = (id: number) => (id === 1 ? 2 : 1);

// Helper to resolve target ID respecting Reversal
export const getTargetId = (ctx: EffectContext, intendedTargetId: number): number => {
  if (!ctx.isReversed) return intendedTargetId;
  const oppId = getOpponentId(ctx.sourcePlayerId);
  if (intendedTargetId === ctx.sourcePlayerId) return oppId;
  if (intendedTargetId === oppId) return ctx.sourcePlayerId;
  return intendedTargetId; 
};

// Check if a treasure is already in play (Hand, Deck, Discard, Field)
export const isTreasureInVault = (gameState: GameState, treasureId: string): boolean => {
    const checkLoc = (p: PlayerState) => {
        if (p.hand.some(c => c.id === treasureId)) return true;
        if (p.deck.some(c => c.id === treasureId)) return true;
        if (p.discardPile.some(c => c.id === treasureId)) return true;
        if (p.fieldSlot?.id === treasureId) return true;
        return false;
    };
    
    if (checkLoc(gameState.player1)) return false;
    if (checkLoc(gameState.player2)) return false;
    if (gameState.field?.card.id === treasureId) return false;
    
    return true;
};

// Check Pentacles Wheel activation condition (MyHP >= 2 * OppHP)
export const checkPentaclesWheelActivation = (prev: GameState): GameState => {
    if (!prev.field || !prev.field.card.name.includes('星币·命运之轮')) return prev;
    
    const ownerId = prev.field.ownerId;
    const oppId = getOpponentId(ownerId);
    
    const ownerHP = ownerId === 1 ? prev.player1.hp : prev.player2.hp;
    const oppHP = oppId === 1 ? prev.player1.hp : prev.player2.hp;
    
    const shouldBeActive = ownerHP >= 2 * oppHP;
    
    if (prev.field.active !== shouldBeActive) {
        return {
            ...prev,
            field: { ...prev.field, active: shouldBeActive }
        };
    }
    return prev;
};

export const addMarkToCard = (card: Card, mark: string): Card => {
  // New Rule: Cards can only hold ONE mark. Newer marks overwrite older ones.
  return { ...card, marks: [mark] };
};
