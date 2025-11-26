import { CardDefinition, CardSuit } from '../../../types';
import { damagePlayer, getOpponentId } from '../../../services/actions';

export const WANDS_DEVIL: CardDefinition = {
    id: 'wands-devil', name: '权杖·恶魔', suit: CardSuit.WANDS, rank: 215,
    keywords: [],
    onReveal: (ctx) => {
        const atk = ctx.gameState[ctx.sourcePlayerId === 1 ? 'player1' : 'player2'].atk;
        damagePlayer(ctx, getOpponentId(ctx.sourcePlayerId), atk);
    },
    onDiscard: (ctx) => {
        const atk = ctx.gameState[ctx.sourcePlayerId === 1 ? 'player1' : 'player2'].atk;
        damagePlayer(ctx, ctx.sourcePlayerId, atk);
    }
};