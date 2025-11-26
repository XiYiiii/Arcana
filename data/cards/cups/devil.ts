

import { CardDefinition, CardSuit } from '../../../types';
import { damagePlayer, drawCards } from '../../../services/actions';

export const CUPS_DEVIL: CardDefinition = {
    id: 'cups-devil', name: '圣杯·恶魔', suit: CardSuit.CUPS, rank: 115,
    description: "打出：随机抽取0~2张牌，每抽一张扣除2生命。",
    keywords: [],
    onReveal: (ctx) => {
        const count = Math.floor(Math.random() * 3); // 0, 1, or 2
        ctx.log(`【恶魔】掷骰结果：抽取 ${count} 张牌。`);
        if (count > 0) {
            damagePlayer(ctx, ctx.sourcePlayerId, count * 2);
            drawCards(ctx, ctx.sourcePlayerId, count);
        }
    }
};