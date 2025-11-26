

import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer } from '../../../services/actions';

export const SWORDS_HANGEDMAN: CardDefinition = {
    id: 'swords-hangedman', name: '宝剑·倒吊人', suit: CardSuit.SWORDS, rank: 312,
    description: "打出：本回合每对对方造成1点伤害，对己方再造成1点伤害。同时将等量的己方手牌标记为“宝剑·倒吊人”。\n(标记“宝剑·倒吊人”)打出后，己方恢复2点Hp。",
    keywords: [Keyword.IMPRINT],
    onReveal: (ctx) => {
        modifyPlayer(ctx, ctx.sourcePlayerId, p => ({ ...p, swordsHangedManActive: true }));
        ctx.log("【倒吊人】契约生效！伤害将反噬并转化力量。");
    }
};