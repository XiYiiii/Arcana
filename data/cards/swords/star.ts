import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, discardCards, setField, shufflePlayerDeck } from '../../../services/actions';

export const SWORDS_STAR: CardDefinition = {
    id: 'swords-star', name: '宝剑·星星', suit: CardSuit.SWORDS, rank: 317,
    keywords: [Keyword.FIELD],
    onDraw: (ctx) => {
        const hand = ctx.gameState[ctx.sourcePlayerId === 1 ? 'player1' : 'player2'].hand;
        const target = hand.find(c => c.name.includes('太阳') || c.name.includes('月亮'));
        
        if (target) {
            const copy = { ...target, instanceId: `copy-${Date.now()}`, marks: [], description: target.description || "" };
            ctx.log(`【宝剑·星星】复制了 [${target.name}]！`);
            modifyPlayer(ctx, ctx.sourcePlayerId, p => ({ ...p, hand: [...p.hand, copy] }));
            discardCards(ctx, ctx.sourcePlayerId, [ctx.card.instanceId]);
        } else {
            ctx.log(`【宝剑·星星】未找到目标，回归星空。`);
            modifyPlayer(ctx, ctx.sourcePlayerId, p => ({
                ...p,
                hand: p.hand.filter(c => c.instanceId !== ctx.card.instanceId),
                deck: [...p.deck, ctx.card]
            }));
            shufflePlayerDeck(ctx, ctx.sourcePlayerId);
        }
    },
    onDiscard: (ctx) => {
        setField(ctx, ctx.card, true);
    }
};