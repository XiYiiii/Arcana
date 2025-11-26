

import { CardDefinition, CardSuit, InstantWindow, Keyword } from '../../../types';
import { modifyPlayer, drawCards, getOpponentId, addMarkToCard, putCardInDeck } from '../../../services/actions';

export const CUPS_FOOL: CardDefinition = {
    id: 'cups-fool', name: '圣杯·愚者', suit: CardSuit.CUPS, rank: 100,
    keywords: [Keyword.IMPRINT, Keyword.SHUFFLE],
    onDraw: (ctx) => {
        ctx.setGameState(prev => ({
            ...prev!,
            interaction: {
                id: `cups-fool-draw-${Date.now()}`,
                playerId: ctx.sourcePlayerId,
                title: "圣杯·愚者",
                description: "是否消除此牌特效并随机标记对手一张牌？(否则保持原样)",
                options: [
                    {
                        label: "消除特效并标记",
                        action: () => {
                            const oppId = getOpponentId(ctx.sourcePlayerId);
                            // Random mark logic
                            modifyPlayer(ctx, oppId, p => {
                                if (p.hand.length === 0) return p;
                                const r = Math.floor(Math.random() * p.hand.length);
                                return {
                                    ...p,
                                    hand: p.hand.map((h, i) => i === r ? addMarkToCard(h, 'mark-cups-fool') : h)
                                };
                            });
                            // Mark self disabled
                            modifyPlayer(ctx, ctx.sourcePlayerId, p => ({
                                ...p, 
                                hand: p.hand.map(h => h.instanceId === ctx.card.instanceId ? addMarkToCard(h, 'mark-disabled') : h)
                            }));
                            ctx.log("【圣杯·愚者】嘲弄！随机标记了对手手牌。");
                            ctx.setGameState(curr => curr ? ({...curr, interaction: null}) : null);
                        }
                    },
                    { label: "保留特效", action: () => ctx.setGameState(s => s?({...s, interaction:null}):null) }
                ]
            }
        }));
    },
    onReveal: (ctx) => {
        if(ctx.card.marks.includes('mark-disabled')) {
            ctx.log("【圣杯·愚者】特效已失效。");
            return;
        }
        const oppId = getOpponentId(ctx.sourcePlayerId);
        modifyPlayer(ctx, oppId, p => ({...p, immunityNextTurn: true}));
        drawCards(ctx, ctx.sourcePlayerId, 2);
    },
    canInstant: (w) => w === InstantWindow.AFTER_REVEAL,
    onInstant: (ctx) => {
        if(ctx.card.marks.includes('mark-disabled')) return;
        const oppId = getOpponentId(ctx.sourcePlayerId);
        ctx.log("【愚者】调换！");
        modifyPlayer(ctx, oppId, p => {
             const oppCard = p.fieldSlot;
             if(!oppCard) return p;
             return { ...p, fieldSlot: ctx.card, hand: [...p.hand, oppCard] };
        });
    },
    onDiscard: (ctx) => {
        if(ctx.card.marks.includes('mark-disabled')) return;
        // Logic: Remove from discard pile (where it is now) -> Put in Opp Deck -> Shuffle
        const oppId = getOpponentId(ctx.sourcePlayerId);
        
        // Remove from self discard
        modifyPlayer(ctx, ctx.sourcePlayerId, p => ({
            ...p, discardPile: p.discardPile.filter(c => c.instanceId !== ctx.card.instanceId)
        }));
        
        // Add to opp deck and shuffle
        putCardInDeck(ctx, oppId, ctx.card, true);
    }
};