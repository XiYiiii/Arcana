
import { CardDefinition, CardSuit } from '../../../types';
import { modifyPlayer } from '../../../services/actions';

export const CUPS_STRENGTH: CardDefinition = {
    id: 'cups-strength', name: '圣杯·力量', suit: CardSuit.CUPS, rank: 108,
    description: "打出：Atk+1。",
    keywords: [],
    onReveal: (ctx) => { modifyPlayer(ctx, ctx.sourcePlayerId, p => ({...p, atk: p.atk + 1})); }
};
