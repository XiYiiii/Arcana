import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { damagePlayer, getOpponentId, putCardInDeck } from '../../../services/actions';

export const SWORDS_WHEEL: CardDefinition = {
    id: 'swords-wheel', name: '宝剑·命运之轮', suit: CardSuit.SWORDS, rank: 310,
    keywords: [Keyword.SHUFFLE],
    onDraw: (ctx) => {
        const atk = ctx.gameState[ctx.sourcePlayerId === 1 ? 'player1' : 'player2'].atk;
        const oppId = getOpponentId(ctx.sourcePlayerId);
        damagePlayer(ctx, oppId, atk);
        
        // Move to opponent hand
        ctx.setGameState(prev => {
            if(!prev) return null;
            const myKey = ctx.sourcePlayerId === 1 ? 'player1' : 'player2';
            const oppKey = oppId === 1 ? 'player1' : 'player2';
            const me = prev[myKey];
            const opp = prev[oppKey];
            
            // Remove from my hand (where it is after draw)
            const newMyHand = me.hand.filter(c => c.instanceId !== ctx.card.instanceId);
            const newOppHand = [...opp.hand, ctx.card];
            
            ctx.log(`【命运之轮】流转！飞入了对手手牌。`);

            return {
                ...prev,
                [myKey]: { ...me, hand: newMyHand },
                [oppKey]: { ...opp, hand: newOppHand }
            };
        });
    },
    onReveal: (ctx) => {
        const atk = ctx.gameState[ctx.sourcePlayerId === 1 ? 'player1' : 'player2'].atk;
        const oppId = getOpponentId(ctx.sourcePlayerId);
        damagePlayer(ctx, oppId, 2 * atk);
        
        // Remove from fieldSlot (so standard discard phase doesn't see it)
        ctx.setGameState(prev => {
            if(!prev) return null;
            const myKey = ctx.sourcePlayerId === 1 ? 'player1' : 'player2';
            return {
                ...prev,
                [myKey]: { ...prev[myKey], fieldSlot: null }
            };
        });
        
        putCardInDeck(ctx, oppId, ctx.card, true); // True = Shuffle
    }
};