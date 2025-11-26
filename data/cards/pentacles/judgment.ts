
import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { setField } from '../../../services/actions';

export const PENTACLES_JUDGMENT: CardDefinition = {
    id: 'pentacles-judgment', name: '星币·审判', suit: CardSuit.PENTACLES, rank: 420,
    keywords: [Keyword.FIELD],
    onReveal: (ctx) => {
        setField(ctx, ctx.card, true);
        ctx.log(`【星币·审判】开始清算！每一回合结束时将结算伤害差值。`);
    }
};
