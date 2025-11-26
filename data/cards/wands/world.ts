import { CardDefinition, CardSuit, InstantWindow, Keyword } from '../../../types';
import { modifyPlayer, getOpponentId } from '../../../services/actions';

export const WANDS_WORLD: CardDefinition = {
    id: 'wands-world', name: '权杖·世界', suit: CardSuit.WANDS, rank: 221,
    keywords: [Keyword.SUBSTITUTE],
    onDiscard: (ctx) => {
        const oppId = getOpponentId(ctx.sourcePlayerId);
        setTimeout(() => {
             modifyPlayer(ctx, ctx.sourcePlayerId, p => ({...p, discardPile: p.discardPile.filter(c => c.instanceId !== ctx.card.instanceId)}));
             modifyPlayer(ctx, oppId, p => ({...p, discardPile: [ctx.card, ...p.discardPile]})); 
        }, 50);
    },
    canInstant: (w) => w === InstantWindow.BEFORE_REVEAL,
    onInstant: (ctx) => {
        modifyPlayer(ctx, ctx.sourcePlayerId, p => {
             const oldField = p.fieldSlot;
             return { ...p, hand: [...p.hand, oldField!], fieldSlot: ctx.card };
        });
        ctx.log("【世界】降临！替代了原本的卡牌。");
    }
};