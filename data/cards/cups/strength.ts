import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { setField } from '../../../services/actions';

export const CUPS_STRENGTH: CardDefinition = {
    id: 'cups-strength', name: '圣杯·力量', suit: CardSuit.CUPS, rank: 108,
    keywords: [Keyword.FIELD],
    onReveal: (ctx) => {
        setField(ctx, ctx.card, true);
    }
};