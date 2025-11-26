import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, getOpponentId } from '../../../services/actions';

export const WANDS_MOON: CardDefinition = {
    id: 'wands-moon', name: '权杖·月亮', suit: CardSuit.WANDS, rank: 218,
    keywords: [Keyword.INVALIDATE],
    onDiscard: (ctx) => {
        modifyPlayer(ctx, getOpponentId(ctx.sourcePlayerId), p => ({ ...p, hand: [...p.hand, ctx.card] }));
        const myKey = ctx.sourcePlayerId === 1 ? 'player1' : 'player2';
        ctx.setGameState(prev => {
            if(!prev) return null;
            const me = prev[myKey];
            // Remove from my discard, it went to opp hand
            return {
                ...prev,
                [myKey]: { ...me, discardPile: me.discardPile.filter(c => c.instanceId !== ctx.card.instanceId) }
            };
        });
    }
};