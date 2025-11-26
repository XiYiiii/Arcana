import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { discardCards, destroyCard, getOpponentId } from '../../../services/actions';

export const PENTACLES_STRENGTH: CardDefinition = {
    id: 'pentacles-strength', name: '星币·力量', suit: CardSuit.PENTACLES, rank: 408,
    keywords: [Keyword.DESTROY],
    onReveal: (ctx) => {
        // Calculate targets synchronously first to avoid state race conditions
        let myCardIdToDiscard: string | null = null;
        let oppCardIdToDestroy: string | null = null;
        
        const myKey = ctx.sourcePlayerId === 1 ? 'player1' : 'player2';
        const oppId = getOpponentId(ctx.sourcePlayerId);
        const oppKey = oppId === 1 ? 'player1' : 'player2';
        
        const myHand = ctx.gameState[myKey].hand.filter(c => !c.isTreasure);
        if (myHand.length > 0) {
            myCardIdToDiscard = myHand[Math.floor(Math.random() * myHand.length)].instanceId;
        }

        const oppHand = ctx.gameState[oppKey].hand.filter(c => !c.isTreasure);
        if (oppHand.length > 0) {
            oppCardIdToDestroy = oppHand[Math.floor(Math.random() * oppHand.length)].instanceId;
        }
        
        // Execute actions
        if (myCardIdToDiscard) {
            discardCards(ctx, ctx.sourcePlayerId, [myCardIdToDiscard]);
        }
        
        if (oppCardIdToDestroy) {
            // Need to change context source player to Opponent for destroy? 
            // Usually 'destroyCard' ctx.sourcePlayerId refers to who initiated the action for logs,
            // but the function uses sourcePlayerId to find the 'key'.
            // destroyCard Implementation: "const key = ctx.sourcePlayerId === 1 ? 'player1' : 'player2';"
            // So we must pass the context where sourcePlayerId is the VICTIM (Opponent) if we want to destroy THEIR card.
            const oppCtx = { ...ctx, sourcePlayerId: oppId };
            destroyCard(oppCtx, oppCardIdToDestroy);
            ctx.log(`[星币·力量] 碾压！销毁了对手的一张牌。`);
        }
    }
};