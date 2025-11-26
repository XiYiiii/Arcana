import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { setField } from '../../../services/actions';

export const PENTACLES_WHEEL: CardDefinition = {
    id: 'pentacles-wheel', name: '星币·命运之轮', suit: CardSuit.PENTACLES, rank: 999,
    keywords: [Keyword.FIELD],
    onDraw: (ctx) => {
        ctx.log(`【星币·命运之轮】被抽到了！展示给对手。`);
    },
    onReveal: (ctx) => {
        setField(ctx, ctx.card);
    }
};