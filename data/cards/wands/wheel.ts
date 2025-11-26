import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, getOpponentId } from '../../../services/actions';

export const WANDS_WHEEL: CardDefinition = {
    id: 'wands-wheel', name: '权杖·命运之轮', suit: CardSuit.WANDS, rank: 210,
    keywords: [Keyword.INVALIDATE],
    onResolveStatus: (ctx) => {
       const oppId = getOpponentId(ctx.sourcePlayerId);
       modifyPlayer(ctx, oppId, p => ({ ...p, isInvalidated: true }));
    },
    onDiscard: (ctx) => {
       const oppId = getOpponentId(ctx.sourcePlayerId);
       modifyPlayer(ctx, oppId, p => ({ ...p, invalidateNextPlayedCard: true }));
    }
};