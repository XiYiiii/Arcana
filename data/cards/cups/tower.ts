import { CardDefinition, CardSuit } from '../../../types';
import { damagePlayer, modifyPlayer, getOpponentId } from '../../../services/actions';

export const CUPS_TOWER: CardDefinition = {
    id: 'cups-tower', name: '圣杯·高塔', suit: CardSuit.CUPS, rank: 116,
    keywords: [],
    onDraw: (ctx) => {
        damagePlayer(ctx, ctx.sourcePlayerId, 2);
        const oppId = getOpponentId(ctx.sourcePlayerId);
        modifyPlayer(ctx, ctx.sourcePlayerId, p => ({...p, hand: p.hand.filter(c => c.instanceId !== ctx.card.instanceId)}));
        modifyPlayer(ctx, oppId, p => ({...p, deck: [...p.deck, ctx.card]})); // deck push ends up at bottom
    }
};