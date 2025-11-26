import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, getOpponentId, blindSeize, putCardInDeck } from '../../../services/actions';

export const CUPS_LOVERS: CardDefinition = {
    id: 'cups-lovers', name: '圣杯·恋人', suit: CardSuit.CUPS, rank: 106,
    keywords: [Keyword.BLIND_SEIZE, Keyword.SHUFFLE],
    onDraw: (ctx) => {
        blindSeize(ctx, 1);
        // Move this card to opponent hand
        const oppId = getOpponentId(ctx.sourcePlayerId);
        modifyPlayer(ctx, ctx.sourcePlayerId, p => ({...p, hand: p.hand.filter(c => c.instanceId !== ctx.card.instanceId)}));
        modifyPlayer(ctx, oppId, p => ({...p, hand: [...p.hand, ctx.card]}));
    },
    onReveal: (ctx) => {
        modifyPlayer(ctx, ctx.sourcePlayerId, p => ({...p, fieldSlot: null}));
        putCardInDeck(ctx, ctx.sourcePlayerId, ctx.card, true);
    }
};