import { CardDefinition, CardSuit, InstantWindow, Keyword } from '../../../types';
import { modifyPlayer, getOpponentId } from '../../../services/actions';

export const CUPS_WORLD: CardDefinition = {
    id: 'cups-world', name: '圣杯·世界', suit: CardSuit.CUPS, rank: 121,
    keywords: [Keyword.REVERSE],
    onReveal: (ctx) => {
        modifyPlayer(ctx, ctx.sourcePlayerId, p => ({
             ...p, fieldSlot: null, deck: [...p.deck, ctx.card]
        }));
    },
    canInstant: (w) => w === InstantWindow.AFTER_REVEAL,
    onInstant: (ctx) => {
         const oppId = getOpponentId(ctx.sourcePlayerId);
         modifyPlayer(ctx, oppId, p => ({...p, isReversed: true, deck: [ctx.card, ...p.deck]}));
         modifyPlayer(ctx, ctx.sourcePlayerId, p => ({...p, hand: p.hand.filter(c=>c.instanceId!==ctx.card.instanceId)}));
    }
};