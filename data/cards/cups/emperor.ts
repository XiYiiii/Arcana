import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { getOpponentId, discardCards, modifyPlayer, addMarkToCard } from '../../../services/actions';

export const CUPS_EMPEROR: CardDefinition = {
    id: 'cups-emperor', name: '圣杯·皇帝', suit: CardSuit.CUPS, rank: 104, 
    keywords: [Keyword.IMPRINT], 
    onDraw: (ctx) => { 
      ctx.setGameState(prev => {
        if (!prev) return null;
        const oppId = getOpponentId(ctx.sourcePlayerId);
        const oppKey = oppId === 1 ? 'player1' : 'player2';
        const handNames = prev[oppKey].hand.map(c => c.name).join(', ');
        ctx.log(`【皇帝】洞察：对手手牌为 [${handNames}]`);
        // Manually discard this card as it's being drawn
        const ctxDiscard = {...ctx, card: ctx.card};
        // Need to ensure it's removed from hand if it was added, or prevent add.
        // onDraw happens after add.
        discardCards(ctxDiscard, ctx.sourcePlayerId, [ctx.card.instanceId]);
        return prev;
      });
    },
    onReveal: (ctx) => {
        // Mark random card
        modifyPlayer(ctx, ctx.sourcePlayerId, p => {
            if (p.hand.length === 0) return p;
            const idx = Math.floor(Math.random() * p.hand.length);
            return {
                ...p,
                hand: p.hand.map((c, i) => i === idx ? addMarkToCard(c, 'mark-cups-emperor') : c)
            };
        });
        
        // Also check if this card itself has the mark (recursive logic)
        if (ctx.card.marks.includes('mark-cups-emperor')) {
            const oppId = getOpponentId(ctx.sourcePlayerId);
            const oppKey = oppId === 1 ? 'player1' : 'player2';
            const handNames = ctx.gameState[oppKey].hand.map(c => c.name).join(', ');
            ctx.log(`【皇帝】标记触发：对手手牌为 [${handNames}]`);
        }
    }
};