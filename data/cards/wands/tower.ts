import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { blindSeize, getOpponentId } from '../../../services/actions';

export const WANDS_TOWER: CardDefinition = {
    id: 'wands-tower', name: '权杖·高塔', suit: CardSuit.WANDS, rank: 216,
    keywords: [Keyword.BLIND_SEIZE],
    onDraw: (ctx) => {
        const oppCtx = { ...ctx, sourcePlayerId: getOpponentId(ctx.sourcePlayerId) };
        blindSeize(oppCtx, 1);
    }
};