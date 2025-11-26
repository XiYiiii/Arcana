import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer } from '../../../services/actions';

export const SWORDS_HANGEDMAN: CardDefinition = {
    id: 'swords-hangedman', name: '宝剑·倒吊人', suit: CardSuit.SWORDS, rank: 312,
    keywords: [Keyword.IMPRINT],
    onReveal: (ctx) => {
        modifyPlayer(ctx, ctx.sourcePlayerId, p => ({ ...p, swordsHangedManActive: true }));
        ctx.log("【倒吊人】契约生效！伤害将反噬并转化力量。");
    }
};