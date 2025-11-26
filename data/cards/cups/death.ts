

import { CardDefinition, CardSuit } from '../../../types';
import { modifyPlayer } from '../../../services/actions';

export const CUPS_DEATH: CardDefinition = {
    id: 'cups-death', name: '圣杯·死神', suit: CardSuit.CUPS, rank: 113,
    description: "打出：双方扣除一半生命。\n弃置：双方恢复2Hp。",
    keywords: [],
    onReveal: (ctx) => {
        modifyPlayer(ctx, 1, p => ({...p, hp: Math.floor(p.hp/2)}));
        modifyPlayer(ctx, 2, p => ({...p, hp: Math.floor(p.hp/2)}));
    },
    onDiscard: (ctx) => {
        modifyPlayer(ctx, 1, p => ({...p, hp: p.hp + 2}));
        modifyPlayer(ctx, 2, p => ({...p, hp: p.hp + 2}));
    }
};