
import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { setField } from '../../../services/actions';

export const PENTACLES_WHEEL: CardDefinition = {
    id: 'pentacles-wheel', name: '星币·命运之轮', suit: CardSuit.PENTACLES, rank: 999,
    description: "抽到：向对方展示这张牌。\n打出：设置场地为“星币·命运之轮”。\n被动：这张牌的优先级视为999。\n(场地“星币·命运之轮”)当一方的Hp大于等于另一方的两倍时，此场地被激活。当此场地激活时，游戏的胜利条件从“对方Hp小于等于0”改为“己方Hp小于等于0”。",
    keywords: [Keyword.FIELD],
    onDraw: (ctx) => {
        ctx.log(`【星币·命运之轮】被抽到了！展示给对手。`);
    },
    onReveal: (ctx) => {
        setField(ctx, ctx.card);
    }
};
