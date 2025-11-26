
import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { setField, transformCard } from '../../../services/actions';

export const PENTACLES_MAGICIAN: CardDefinition = {
    id: 'pentacles-magician', name: '星币·魔术师', suit: CardSuit.PENTACLES, rank: 401,
    description: "打出：设置场地为“星币·魔术师”并激活之。\n弃置：变化双方手牌中各一张牌。\n(场地“星币·魔术师”)当此场地激活时，每个玩家每次抽牌前，打乱其抽牌堆。",
    keywords: [Keyword.FIELD, Keyword.TRANSFORM, Keyword.SHUFFLE],
    onReveal: (ctx) => {
        setField(ctx, ctx.card);
    },
    onDiscard: (ctx) => {
        const transformRandom = (pid: number) => {
             const p = ctx.gameState[pid === 1 ? 'player1' : 'player2'];
             if (p.hand.length > 0) {
                 const rnd = p.hand[Math.floor(Math.random() * p.hand.length)];
                 transformCard(ctx, pid, rnd.instanceId);
             }
        };
        transformRandom(1);
        transformRandom(2);
    }
};
