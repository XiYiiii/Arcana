import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { setField } from '../../../services/actions';

export const SWORDS_DEATH: CardDefinition = {
    id: 'swords-death', name: '宝剑·死神', suit: CardSuit.SWORDS, rank: 313,
    keywords: [Keyword.FIELD],
    onReveal: (ctx) => {
        setField(ctx, ctx.card, true);
    }
};