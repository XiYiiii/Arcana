

import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, addMarkToCard, discardCards, drawCards, damagePlayer } from '../../../services/actions';

export const SWORDS_TOWER: CardDefinition = {
    id: 'swords-tower', name: '宝剑·高塔', suit: CardSuit.SWORDS, rank: 316,
    description: "抽到：将双方所有手牌标记为“宝剑·高塔”，弃置此牌。\n弃置：己方抽一张牌，标记为“宝剑·高塔”。\n(标记“宝剑·高塔”)此牌被打出时，己方对自己造成1点伤害。",
    keywords: [Keyword.IMPRINT],
    onDraw: (ctx) => {
        const markAll = (pid: number) => {
            modifyPlayer(ctx, pid, p => ({
                ...p,
                hand: p.hand.map(c => addMarkToCard(c, 'mark-swords-tower'))
            }));
        };
        markAll(1);
        markAll(2);
        discardCards(ctx, ctx.sourcePlayerId, [ctx.card.instanceId]);
    },
    onDiscard: (ctx) => {
        drawCards(ctx, ctx.sourcePlayerId, 1);
        setTimeout(() => {
            modifyPlayer(ctx, ctx.sourcePlayerId, p => {
                if(p.hand.length === 0) return p;
                const last = p.hand[p.hand.length-1];
                return {
                    ...p,
                    hand: p.hand.map(c => c.instanceId === last.instanceId ? addMarkToCard(c, 'mark-swords-tower') : c)
                };
            });
        }, 100);
    }
};