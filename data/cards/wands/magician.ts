

import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, setField } from '../../../services/actions';

export const WANDS_MAGICIAN: CardDefinition = {
    id: 'wands-magician', name: '权杖·魔术师', suit: CardSuit.WANDS, 
    // "Passive: Rank is 10". 
    rank: 10,
    description: "打出：抽一张牌并与此牌交换。那张牌的优先级临时与此牌相同。\n弃置：设置场地为“权杖·魔术师”。\n被动：这张卡的优先级视为10。\n(场地“权杖·魔术师”)当有四张牌被弃置后，此场地被激活。此场地激活时，所有被弃置的牌回到抽牌堆。",
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