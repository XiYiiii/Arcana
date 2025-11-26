


import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, addMarkToCard, getOpponentId, lockRandomCard } from '../../../services/actions';

export const WANDS_HIEROPHANT: CardDefinition = {
    id: 'wands-hierophant', name: '权杖·教皇', suit: CardSuit.WANDS, rank: 205,
    description: "打出：若手牌中有“皇帝”，将所有手牌中的“皇帝”标记为“权杖·教皇”。\n弃置：随机锁定对方一张牌。\n印记(权杖·教皇)：被打出时，抽2张牌或者无效对方打出的牌。",
    keywords: [Keyword.IMPRINT, Keyword.INVALIDATE],
    onReveal: (ctx) => {
        modifyPlayer(ctx, ctx.sourcePlayerId, p => {
            const hasEmperor = p.hand.some(c => c.name.includes('皇帝'));
            if (!hasEmperor) return p;
            
            return {
                ...p,
                hand: p.hand.map(c => c.name.includes('皇帝') ? addMarkToCard(c, 'mark-wands-hierophant') : c)
            };
        });
    },
    onDiscard: (ctx) => {
        const oppId = getOpponentId(ctx.sourcePlayerId);
        lockRandomCard(ctx, oppId, 1);
    }
};