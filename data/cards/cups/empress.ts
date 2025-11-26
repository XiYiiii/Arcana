import { CardDefinition, CardSuit, InstantWindow } from '../../../types';
import { modifyPlayer, drawCards, getOpponentId } from '../../../services/actions';

export const CUPS_EMPRESS: CardDefinition = {
    id: 'cups-empress', name: '圣杯·女皇', suit: CardSuit.CUPS, rank: 103,
    keywords: [],
    onReveal: (ctx) => { modifyPlayer(ctx, ctx.sourcePlayerId, p => ({...p, effectDoubleNext: true})); },
    canInstant: (w) => w === InstantWindow.BEFORE_REVEAL,
    onInstant: (ctx) => { 
        modifyPlayer(ctx, getOpponentId(ctx.sourcePlayerId), p => ({...p, effectDoubleNext: true})); 
        drawCards(ctx, ctx.sourcePlayerId, 2);
    }
};