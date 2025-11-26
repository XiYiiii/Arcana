

import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { setField } from '../../../services/actions';

export const CUPS_STRENGTH: CardDefinition = {
    id: 'cups-strength', name: '圣杯·力量', suit: CardSuit.CUPS, rank: 108,
    description: "打出：设置场地为“圣杯·力量”，并激活之。\n(场地“圣杯·力量”)当此场地激活时，布置此场地的玩家获得Atk+1。此场地被弃置时该buff消除。",
    keywords: [Keyword.FIELD],
    onReveal: (ctx) => {
        setField(ctx, ctx.card);
    }
};