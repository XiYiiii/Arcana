import { CardDefinition, CardSuit, InstantWindow } from '../../../types';
import { modifyPlayer } from '../../../services/actions';

export const CUPS_PRIESTESS: CardDefinition = {
    id: 'cups-priestess', name: '圣杯·女祭司', suit: CardSuit.CUPS, rank: 102,
    keywords: [],
    onReveal: (ctx) => { modifyPlayer(ctx, ctx.sourcePlayerId, p => ({...p, immunityNextTurn: true})); },
    canInstant: (w) => w === InstantWindow.BEFORE_REVEAL,
    onInstant: (ctx) => { modifyPlayer(ctx, ctx.sourcePlayerId, p => ({...p, immunityThisTurn: true})); }
};