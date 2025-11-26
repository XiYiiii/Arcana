import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { transformCard, damagePlayer, getOpponentId } from '../../../services/actions';

export const PENTACLES_SUN: CardDefinition = {
    id: 'pentacles-sun', name: '星币·太阳', suit: CardSuit.PENTACLES, rank: 419,
    keywords: [Keyword.TRANSFORM],
    onDraw: (ctx) => {
        transformCard(ctx, ctx.sourcePlayerId, ctx.card.instanceId);
    },
    onReveal: (ctx) => {
        const atk = ctx.gameState[ctx.sourcePlayerId===1?'player1':'player2'].atk;
        damagePlayer(ctx, getOpponentId(ctx.sourcePlayerId), 2 * atk);
    }
};