import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, setField } from '../../../services/actions';

export const WANDS_MAGICIAN: CardDefinition = {
    id: 'wands-magician', name: '权杖·魔术师', suit: CardSuit.WANDS, 
    // "Passive: Rank is 10". 
    rank: 10,
    keywords: [Keyword.FIELD],
    onReveal: (ctx) => {
        const pKey = ctx.sourcePlayerId === 1 ? 'player1' : 'player2';
        const deck = ctx.gameState[pKey].deck;
        if(deck.length > 0) {
            const newCard = { ...deck[0], tempRank: 10 }; // Inherit rank 10
            modifyPlayer(ctx, ctx.sourcePlayerId, p => ({
                ...p, deck: p.deck.slice(1), fieldSlot: newCard, hand: [...p.hand, ctx.card]
            }));
        }
    },
    onDiscard: (ctx) => {
        setField(ctx, ctx.card);
    }
};