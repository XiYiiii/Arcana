import { CardDefinition, CardSuit, InstantWindow, Keyword } from '../../../types';
import { modifyPlayer, getOpponentId, addMarkToCard } from '../../../services/actions';

export const CUPS_JUDGMENT: CardDefinition = {
    id: 'cups-judgment', name: '圣杯·审判', suit: CardSuit.CUPS, rank: 120,
    keywords: [Keyword.IMPRINT],
    canInstant: (w) => w === InstantWindow.BEFORE_SET,
    onInstant: (ctx) => {
        const oppId = getOpponentId(ctx.sourcePlayerId);
        modifyPlayer(ctx, oppId, p => {
            const indices = p.hand.map((_,i)=>i);
            const chosen = [];
            for(let k=0; k<2 && indices.length>0; k++) {
                const r = Math.floor(Math.random()*indices.length);
                chosen.push(indices[r]);
                indices.splice(r,1);
            }
            return {...p, hand: p.hand.map((c,i)=> chosen.includes(i) ? addMarkToCard(c, 'mark-cups-judgment') : c)};
        });
    },
};