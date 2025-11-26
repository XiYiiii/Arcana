
import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer } from '../../../services/actions';

export const CUPS_HERMIT: CardDefinition = {
    id: 'cups-hermit', name: '圣杯·隐者', suit: CardSuit.CUPS, rank: 109, 
    description: "打出：占卜己方两张牌，然后弃置其中一张。",
    keywords: [Keyword.SCRY],
    onReveal: (ctx) => {
        ctx.setGameState(prev => {
            if(!prev) return null;
            const myKey = ctx.sourcePlayerId === 1 ? 'player1' : 'player2';
            const deck = prev[myKey].deck;
            if (deck.length === 0) return prev;
            return {
                ...prev,
                interaction: {
                    id: `hermit-scry-${Date.now()}`,
                    playerId: ctx.sourcePlayerId,
                    title: "【隐者】占卜",
                    description: "选择一张弃置:",
                    inputType: 'CARD_SELECT',
                    cardsToSelect: deck.slice(0, 2),
                    onCardSelect: (c) => {
                        const k = ctx.sourcePlayerId === 1 ? 'player1' : 'player2';
                        ctx.setGameState(curr => {
                           if(!curr) return null;
                           return { 
                               ...curr, interaction: null, 
                               [k]: { 
                                   ...curr[k], 
                                   deck: curr[k].deck.filter(dc => dc.instanceId !== c.instanceId), 
                                   discardPile: [...curr[k].discardPile, c] 
                               } 
                           };
                        });
                    }
                }
            };
        });
    }
};
