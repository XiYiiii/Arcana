

import { CardDefinition, CardSuit, InstantWindow, Keyword } from '../../../types';
import { modifyPlayer, setField } from '../../../services/actions';

export const CUPS_TEMPERANCE: CardDefinition = {
    id: 'cups-temperance', name: '圣杯·节制', suit: CardSuit.CUPS, rank: 114, 
    description: "打出：设置场地为“圣杯·节制”。\n插入(置牌前)：丢弃己方所有牌。\n(场地“圣杯·节制”)当有四张牌被弃置时，此场地被激活。此场地激活时，弃置双方所有牌，然后弃置该场地。",
    keywords: [Keyword.FIELD],
    onReveal: (ctx) => {
       setField(ctx, ctx.card);
    },
    canInstant: (w) => w === InstantWindow.BEFORE_SET,
    onInstant: (ctx) => {
        modifyPlayer(ctx, ctx.sourcePlayerId, p => ({ ...p, hand: [], fieldSlot: null, discardPile: [...p.discardPile, ...p.hand, ...(p.fieldSlot?[p.fieldSlot]:[])] }));
    }
};