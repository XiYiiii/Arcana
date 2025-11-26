

import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { damagePlayer, getOpponentId, putCardInDeck } from '../../../services/actions';

export const SWORDS_WHEEL: CardDefinition = {
    id: 'swords-wheel', name: '宝剑·命运之轮', suit: CardSuit.SWORDS, rank: 310,
    description: "抽到：对对方造成[Atk]点伤害，然后进入对方的手牌。\n打出：对对方造成[2*Atk]点伤害，然后进入对方的抽牌堆，打乱对方的抽牌堆。",
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
        
        // Remove from field/hand logic is standard flow BUT we want it to go to opp DECK instead of discard.
        // We handle this by modifying state now and removing it from current player's control.
        // Usually cards go to discard pile after resolve.
        // We move it now. When standard cleanup happens, it won't be found in slot.
        
        ctx.setGameState(prev => {
            if(!prev) return null;
            const myKey = ctx.sourcePlayerId === 1 ? 'player1' : 'player2';
            // It is in fieldSlot
            return {
                ...prev,
                [myKey]: { ...prev[myKey], fieldSlot: null }
            };
        });
        
        putCardInDeck(ctx, oppId, ctx.card, true); // True = Shuffle
    }
};