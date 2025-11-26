import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { transformCard, discardCards, getOpponentId } from '../../../services/actions';

export const PENTACLES_DEVIL: CardDefinition = {
    id: 'pentacles-devil', name: '星币·恶魔', suit: CardSuit.PENTACLES, rank: 415,
    keywords: [Keyword.TRANSFORM],
    onReveal: (ctx) => {
        const oppId = getOpponentId(ctx.sourcePlayerId);
        // Transform ALL opponent hand
        const oppKey = oppId === 1 ? 'player1' : 'player2';
        const oppHand = ctx.gameState[oppKey].hand;
        
        oppHand.forEach(c => {
            transformCard(ctx, oppId, c.instanceId);
        });
        
        // Discard 1 self
        ctx.setGameState(prev => ({
             ...prev!,
             interaction: {
                 id: `pentacles-devil-discard-${Date.now()}`,
                 playerId: ctx.sourcePlayerId,
                 title: "星币·恶魔 - 代价",
                 description: "弃置一张己方手牌:",
                 inputType: 'CARD_SELECT',
                 cardsToSelect: prev![ctx.sourcePlayerId===1?'player1':'player2'].hand,
                 onCardSelect: (c) => {
                     discardCards(ctx, ctx.sourcePlayerId, [c.instanceId]);
                     ctx.setGameState(s => s ? ({...s, interaction: null}) : null);
                 }
             }
        }));
    },
    onDiscard: (ctx) => {
        // Transform ALL self hand
        const myKey = ctx.sourcePlayerId === 1 ? 'player1' : 'player2';
        const myHand = ctx.gameState[myKey].hand;
        
        myHand.forEach(c => {
             // Don't transform self if logic runs while card is technically in hand (unlikely in onDiscard), 
             // but strictly transform hand.
             transformCard(ctx, ctx.sourcePlayerId, c.instanceId);
        });

        // Discard 1 opponent
        const oppId = getOpponentId(ctx.sourcePlayerId);
        const oppKey = oppId === 1 ? 'player1' : 'player2';
        const oppHand = ctx.gameState[oppKey].hand;
        if(oppHand.length > 0) {
            const r = Math.floor(Math.random() * oppHand.length);
            const target = oppHand[r];
            const oppCtx = { ...ctx, card: target };
            discardCards(oppCtx, oppId, [target.instanceId]);
            ctx.log(`【星币·恶魔】随机弃置了对手的 [${target.name}]。`);
        }
    }
};