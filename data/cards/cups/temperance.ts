import { CardDefinition, CardSuit, InstantWindow, Keyword } from '../../../types';
import { modifyPlayer, setField } from '../../../services/actions';

export const CUPS_TEMPERANCE: CardDefinition = {
    id: 'cups-temperance', name: '圣杯·节制', suit: CardSuit.CUPS, rank: 114, 
    keywords: [Keyword.FIELD],
    onReveal: (ctx) => {
       setField(ctx, ctx.card);
    },
    canInstant: (w) => w === InstantWindow.BEFORE_SET,
    onInstant: (ctx) => {
        modifyPlayer(ctx, ctx.sourcePlayerId, p => ({ ...p, hand: [], fieldSlot: null, discardPile: [...p.discardPile, ...p.hand, ...(p.fieldSlot?[p.fieldSlot]:[])] }));
    }
};