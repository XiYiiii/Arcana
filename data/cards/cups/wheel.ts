
import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, getOpponentId } from '../../../services/actions';

export const CUPS_WHEEL: CardDefinition = {
    id: 'cups-wheel', name: '圣杯·命运之轮', suit: CardSuit.CUPS, rank: 110,
    description: "打出：反转对方的“打出”特效。",
    keywords: [Keyword.REVERSE],
    onReveal: (ctx) => { modifyPlayer(ctx, getOpponentId(ctx.sourcePlayerId), p => ({...p, isReversed: true})); }
};
