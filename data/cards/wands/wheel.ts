
import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, getOpponentId } from '../../../services/actions';

export const WANDS_WHEEL: CardDefinition = {
    id: 'wands-wheel', name: '权杖·命运之轮', suit: CardSuit.WANDS, rank: 210,
    description: "打出：无效对方打出的牌。\n弃置：对方下一张打出的牌被无效。",
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
