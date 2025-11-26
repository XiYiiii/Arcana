
import { CardDefinition, CardSuit } from '../../../types';
import { modifyPlayer } from '../../../services/actions';

export const WANDS_MAGICIAN: CardDefinition = {
    id: 'wands-magician', name: '权杖·魔术师', suit: CardSuit.WANDS, rank: 201,
    description: "打出：抽1张牌并与此牌交换。那张牌的Rank临时与此牌相同。\n被动：这张卡的Rank视为10。",
    keywords: [],
    onReveal: (ctx) => {
        const pKey = ctx.sourcePlayerId === 1 ? 'player1' : 'player2';
        const deck = ctx.gameState[pKey].deck;
        if(deck.length > 0) {
            const newCard = { ...deck[0], tempRank: 201 }; // Inherit rank 201
            modifyPlayer(ctx, ctx.sourcePlayerId, p => ({
                ...p, deck: p.deck.slice(1), fieldSlot: newCard, hand: [...p.hand, ctx.card]
            }));
        }
    }
};
