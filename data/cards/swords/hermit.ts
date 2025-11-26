

import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, drawCards, getOpponentId } from '../../../services/actions';

export const SWORDS_HERMIT: CardDefinition = {
    id: 'swords-hermit', name: '宝剑·隐者', suit: CardSuit.SWORDS, rank: 309,
    description: "打出：占卜己方的一张牌，选择：将其置入对方的抽牌堆顶，直接将其弃置，或抽取之。",
    keywords: [Keyword.SCRY],
    onReveal: (ctx) => {
        ctx.setGameState(prev => {
            if(!prev) return null;
            const myKey = ctx.sourcePlayerId === 1 ? 'player1' : 'player2';
            const deck = prev[myKey].deck;
            if (deck.length === 0) return prev;
            
            const targetCard = deck[0];

            return {
                ...prev,
                interaction: {
                    id: `swords-hermit-${Date.now()}`,
                    playerId: ctx.sourcePlayerId,
                    title: "宝剑·隐者",
                    description: `占卜到：[${targetCard.name}]。请选择去向：`,
                    options: [
                        { 
                            label: "置入对方堆顶", 
                            action: () => {
                                const oppId = getOpponentId(ctx.sourcePlayerId);
                                const myId = ctx.sourcePlayerId;
                                ctx.setGameState(s => {
                                    if(!s) return null;
                                    const mk = myId === 1 ? 'player1' : 'player2';
                                    const ok = oppId === 1 ? 'player1' : 'player2';
                                    return {
                                        ...s,
                                        interaction: null,
                                        [mk]: { ...s[mk], deck: s[mk].deck.slice(1) },
                                        [ok]: { ...s[ok], deck: [targetCard, ...s[ok].deck] }
                                    };
                                });
                            } 
                        },
                        { 
                            label: "直接弃置", 
                            action: () => {
                                modifyPlayer(ctx, ctx.sourcePlayerId, p => ({
                                    ...p,
                                    deck: p.deck.slice(1),
                                    discardPile: [...p.discardPile, targetCard]
                                }));
                                ctx.setGameState(s => s ? ({...s, interaction: null}) : null);
                            } 
                        },
                        { 
                            label: "抽取", 
                            action: () => {
                                drawCards(ctx, ctx.sourcePlayerId, 1);
                                ctx.setGameState(s => s ? ({...s, interaction: null}) : null);
                            } 
                        }
                    ]
                }
            };
        });
    }
};