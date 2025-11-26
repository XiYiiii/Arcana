
import { CardDefinition, CardSuit } from '../../../types';
import { modifyPlayer, drawCards, discardCards } from '../../../services/actions';

export const WANDS_HANGEDMAN: CardDefinition = {
    id: 'wands-hangedman', name: '权杖·倒吊人', suit: CardSuit.WANDS, rank: 212,
    // Description loaded from data/descriptions.ts
    keywords: [],
    onReveal: (ctx) => {
        ctx.setGameState(prev => ({
             ...prev!,
             interaction: {
                 id: `hanged-discard-${Date.now()}`,
                 playerId: ctx.sourcePlayerId,
                 title: "权杖·倒吊人",
                 description: "弃置一张牌:",
                 inputType: 'CARD_SELECT',
                 cardsToSelect: prev![ctx.sourcePlayerId===1?'player1':'player2'].hand,
                 onCardSelect: (c) => {
                     const ctxDisc = {...ctx, card: c};
                     discardCards(ctxDisc, ctx.sourcePlayerId, [c.instanceId]);
                     modifyPlayer(ctx, ctx.sourcePlayerId, p => ({
                         ...p,
                         delayedEffects: [...p.delayedEffects, { turnsRemaining: 1, action: 'DRAW', amount: 2, sourceCardName: '权杖·倒吊人' }]
                     }));
                     ctx.setGameState(s => s ? ({...s, interaction: null}) : null);
                 }
             }
        }));
    },
    onDiscard: (ctx) => {
        drawCards(ctx, ctx.sourcePlayerId, 1);
        modifyPlayer(ctx, ctx.sourcePlayerId, p => ({
            ...p,
            delayedEffects: [...p.delayedEffects, { turnsRemaining: 1, action: 'DISCARD', amount: 2, sourceCardName: '权杖·倒吊人' }]
        }));
    }
};
