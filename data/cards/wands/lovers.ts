import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, getOpponentId, addMarkToCard } from '../../../services/actions';

export const WANDS_LOVERS: CardDefinition = {
    id: 'wands-lovers', name: '权杖·恋人', suit: CardSuit.WANDS, rank: 206,
    keywords: [Keyword.IMPRINT, Keyword.LOCK],
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