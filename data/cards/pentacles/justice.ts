import { CardDefinition, CardSuit, InstantWindow } from '../../../types';
import { modifyPlayer, discardField, damagePlayer, getOpponentId, drawCards } from '../../../services/actions';

export const PENTACLES_JUSTICE: CardDefinition = {
    id: 'pentacles-justice', name: '星币·正义', suit: CardSuit.PENTACLES, rank: 411,
    keywords: [],
    canInstant: () => true, // Valid in all windows
    onInstant: (ctx) => {
        const win = ctx.gameState.instantWindow;
        if (win === InstantWindow.BEFORE_SET) {
             discardField(ctx);
             modifyPlayer(ctx, ctx.sourcePlayerId, p => ({ ...p, hp: p.hp - 2 }));
        } else if (win === InstantWindow.BEFORE_REVEAL) {
             const oppId = getOpponentId(ctx.sourcePlayerId);
             modifyPlayer(ctx, oppId, p => ({ ...p, isReversed: true }));
             modifyPlayer(ctx, ctx.sourcePlayerId, p => ({ ...p, hp: p.hp - 4 }));
        } else if (win === InstantWindow.AFTER_REVEAL) {
             const oppId = getOpponentId(ctx.sourcePlayerId);
             modifyPlayer(ctx, oppId, p => ({ ...p, isInvalidated: true }));
             modifyPlayer(ctx, ctx.sourcePlayerId, p => ({ ...p, hp: p.hp - 4 }));
        } else if (win === InstantWindow.AFTER_EFFECT) {
             drawCards(ctx, ctx.sourcePlayerId, 2);
             modifyPlayer(ctx, ctx.sourcePlayerId, p => ({ ...p, hp: p.hp - 2 }));
        } else {
             ctx.log("当前时机无法触发特效。");
        }
    }
};