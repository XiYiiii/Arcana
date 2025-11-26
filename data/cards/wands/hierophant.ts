
import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, addMarkToCard } from '../../../services/actions';

export const WANDS_HIEROPHANT: CardDefinition = {
    id: 'wands-hierophant', name: '权杖·教皇', suit: CardSuit.WANDS, rank: 205,
    description: "打出：标记手中所有“皇帝”。\n印记(权杖·教皇)：被打出时，抽2张牌或者无效对方打出的牌。",
    keywords: [Keyword.IMPRINT, Keyword.INVALIDATE],
    onReveal: (ctx) => {
        modifyPlayer(ctx, ctx.sourcePlayerId, p => ({
            ...p, hand: p.hand.map(c => c.name.includes('皇帝') ? addMarkToCard(c, 'mark-wands-hierophant') : c)
        }));
    }
};
