
import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, getOpponentId, addMarkToCard } from '../../../services/actions';

export const WANDS_LOVERS: CardDefinition = {
    id: 'wands-lovers', name: '权杖·恋人', suit: CardSuit.WANDS, rank: 206,
    description: "打出：随机将对方手牌中两张牌标记为“权杖·恋人”。\n印记(权杖·恋人)：若手牌中有另一张“权杖·恋人”，则此牌被锁定。",
    keywords: [Keyword.IMPRINT],
    onReveal: (ctx) => {
        const oppId = getOpponentId(ctx.sourcePlayerId);
        modifyPlayer(ctx, oppId, p => {
            if (p.hand.length === 0) return p;
            const indices = Array.from({length: p.hand.length}, (_, i) => i);
            const chosen = [];
            for(let k=0; k<2 && indices.length > 0; k++) {
               const rnd = Math.floor(Math.random() * indices.length);
               chosen.push(indices[rnd]);
               indices.splice(rnd, 1);
            }
            return { ...p, hand: p.hand.map((c, i) => chosen.includes(i) ? addMarkToCard(c, 'mark-lovers') : c) };
        });
    }
};
