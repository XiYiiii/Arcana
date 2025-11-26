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
                description: "是否消除此牌特效并标记对手一张牌？(否则保持原样)",
                options: [
                    {
                        label: "消除特效并标记",
                        action: () => {
                            const oppId = getOpponentId(ctx.sourcePlayerId);
                            ctx.setGameState(s => {
                                if(!s) return null;
                                return {
                                    ...s,
                                    interaction: {
                                        id: `cups-fool-select-${Date.now()}`,
                                        playerId: ctx.sourcePlayerId,
                                        title: "选择目标",
                                        description: "选择对手手牌进行标记:",
                                        inputType: 'CARD_SELECT',
                                        cardsToSelect: s[oppId===1?'player1':'player2'].hand,
                                        onCardSelect: (c) => {
                                            modifyPlayer(ctx, oppId, p => ({...p, hand: p.hand.map(h => h.instanceId === c.instanceId ? addMarkToCard(h, 'mark-cups-fool') : h)}));
                                            modifyPlayer(ctx, ctx.sourcePlayerId, p => ({...p, hand: p.hand.map(h => h.instanceId === ctx.card.instanceId ? addMarkToCard(h, 'mark-disabled') : h)}));
                                            ctx.setGameState(curr => curr ? ({...curr, interaction: null}) : null);
                                        }
                                    }
                                };
                            });
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