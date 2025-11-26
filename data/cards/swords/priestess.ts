import { CardDefinition, CardSuit, InstantWindow } from '../../../types';
import { modifyPlayer } from '../../../services/actions';

export const SWORDS_PRIESTESS: CardDefinition = {
    id: 'swords-priestess', name: '宝剑·女祭司', suit: CardSuit.SWORDS, rank: 302,
    keywords: [],
    onReveal: (ctx) => {
        modifyPlayer(ctx, ctx.sourcePlayerId, p => ({ ...p, damageReflection: true, hasLifesteal: true })); // Custom flags added to PlayerState
    },
    canInstant: (w) => w === InstantWindow.BEFORE_REVEAL,
    onInstant: (ctx) => {
        modifyPlayer(ctx, ctx.sourcePlayerId, p => ({ ...p, incomingDamageConversion: true }));
    }
};