

import { CardDefinition, CardSuit, InstantWindow } from '../../../types';
import { damagePlayer, drawCards, modifyPlayer, discardCards, getOpponentId } from '../../../services/actions';

export const SWORDS_FOOL: CardDefinition = {
    id: 'swords-fool', name: '宝剑·愚者', suit: CardSuit.SWORDS, rank: 300,
    // Description loaded from data/descriptions.ts
    keywords: [],
    onDraw: (ctx) => {
        const atk = ctx.gameState[ctx.sourcePlayerId === 1 ? 'player1' : 'player2'].atk;
        damagePlayer(ctx, ctx.sourcePlayerId, atk);
        // Discard self triggers onDiscard
        discardCards(ctx, ctx.sourcePlayerId, [ctx.card.instanceId]);
    },
    onReveal: (ctx) => {
        const atk = ctx.gameState[ctx.sourcePlayerId === 1 ? 'player1' : 'player2'].atk;
        damagePlayer(ctx, ctx.sourcePlayerId, 2 * atk);
        damagePlayer(ctx, getOpponentId(ctx.sourcePlayerId), 2 * atk);
    },
    canInstant: (w) => w === InstantWindow.BEFORE_REVEAL,
    onInstant: (ctx) => {
        modifyPlayer(ctx, ctx.sourcePlayerId, p => ({ ...p, immunityThisTurn: true, nextDamageDouble: true }));
        ctx.log("【愚者】嘲弄！伤害无效，但下次受伤将翻倍。");
    },
    onDiscard: (ctx) => {
        const atk = ctx.gameState[ctx.sourcePlayerId === 1 ? 'player1' : 'player2'].atk;
        drawCards(ctx, ctx.sourcePlayerId, 1);
        damagePlayer(ctx, getOpponentId(ctx.sourcePlayerId), atk);
    }
};