
import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, addMarkToCard } from '../../../services/actions';

export const WANDS_DEATH: CardDefinition = {
    id: 'wands-death', name: '权杖·死神', suit: CardSuit.WANDS, rank: 213,
    description: "打出：随机归来一张己方的牌，并标记为“权杖·死神”。\n印记(权杖·死神)：这张牌被打出后会被销毁。",
    keywords: [Keyword.RETURN, Keyword.IMPRINT, Keyword.DESTROY],
    onReveal: (ctx) => {
        modifyPlayer(ctx, ctx.sourcePlayerId, p => {
            if(p.discardPile.length === 0) return p;
            const rand = p.discardPile[Math.floor(Math.random() * p.discardPile.length)];
            const marked = addMarkToCard(rand, 'mark-death');
            return {
                ...p,
                discardPile: p.discardPile.filter(c => c.instanceId !== rand.instanceId),
                hand: [...p.hand, marked]
            };
        });
    }
};
