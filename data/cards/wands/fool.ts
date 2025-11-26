

import { CardDefinition, CardSuit, InstantWindow, Keyword } from '../../../types';
import { modifyPlayer, drawCards, getOpponentId } from '../../../services/actions';

export const WANDS_FOOL: CardDefinition = {
    id: 'wands-fool', name: '权杖·愚者', suit: CardSuit.WANDS, rank: 200,
    // Description loaded from data/descriptions.ts
    keywords: [Keyword.INVALIDATE],
    onDraw: (ctx) => {
        ctx.log("【愚者】混乱！双方手牌全部弃置！");
        const discardAll = (pid: number) => {
            modifyPlayer(ctx, pid, p => ({ ...p, hand: [], discardPile: [...p.discardPile, ...p.hand] }));
        }
        discardAll(1);
        discardAll(2);
        // Note: Discarding the Fool from hand here will trigger its onDiscard effect automatically via actions.ts logic if handled, 
        // BUT `modifyPlayer` just moves cards. It doesn't trigger `onDiscard` hooks automatically unless `discardCards` is used.
        // However, the prompt implies the effect structure: "On Draw: Discard All. On Discard: Draw 3".
        // If we just move them, onDiscard won't trigger. 
        // We should manually trigger the onDiscard logic or use discardCards?
        // Using discardCards for all hand is complex due to async state updates.
        // Let's manually trigger the "Draw 3" effect here to simulate the chain, 
        // OR rely on the card being in the discard pile and some mechanic?
        // The prompt says: "【弃置】双方抽取3张牌".
        // If this card is discarded by *any* means (e.g. over hand limit), it triggers.
        // Here, onDraw *causes* it to be discarded.
        // Let's explicitly trigger the discard effect logic here to ensure it happens.
        ctx.log("【愚者】触发弃置连锁：双方抽3张！");
        setTimeout(() => { drawCards(ctx, 1, 3); drawCards(ctx, 2, 3); }, 200);
    },
    onReveal: (ctx) => {
        modifyPlayer(ctx, ctx.sourcePlayerId, p => {
            const fools = p.deck.filter(c => c.name.includes('愚者'));
            if(fools.length > 0) ctx.log(`【愚者】召唤！抽到了 ${fools.length} 张愚者。`);
            return { ...p, deck: p.deck.filter(c => !c.name.includes('愚者')), hand: [...p.hand, ...fools] };
        });
    },
    canInstant: (w) => w === InstantWindow.BEFORE_REVEAL,
    onInstant: (ctx) => {
        const oppId = getOpponentId(ctx.sourcePlayerId);
        modifyPlayer(ctx, oppId, p => {
            if (p.deck.length === 0 || !p.fieldSlot) return p;
            const top = p.deck[0];
            return { ...p, deck: [p.fieldSlot!, ...p.deck.slice(1)], fieldSlot: top };
        });
    },
    onDiscard: (ctx) => {
        // This triggers if discarded normally (e.g. Hand Limit or other effects)
        ctx.log("【愚者】被弃置！双方抽3张牌！");
        drawCards(ctx, 1, 3); 
        drawCards(ctx, 2, 3);
    }
};