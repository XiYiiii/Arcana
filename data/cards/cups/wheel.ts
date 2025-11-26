
import { CardDefinition, CardSuit, Keyword, InstantWindow } from '../../../types';
import { modifyPlayer, getOpponentId, transformCard } from '../../../services/actions';

export const CUPS_WHEEL: CardDefinition = {
    id: 'cups-wheel', name: '圣杯·命运之轮', suit: CardSuit.CUPS, rank: 110,
    description: "打出：反转对方的“打出”特效。\n插入(任意)：变化此牌。",
    keywords: [Keyword.REVERSE, Keyword.TRANSFORM],
    onReveal: (ctx) => { modifyPlayer(ctx, getOpponentId(ctx.sourcePlayerId), p => ({...p, isReversed: true})); },
    canInstant: (w) => w !== InstantWindow.NONE,
    onInstant: (ctx) => {
        transformCard(ctx, ctx.sourcePlayerId, ctx.card.instanceId);
    }
};
