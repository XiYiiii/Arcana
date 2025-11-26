
import { CardDefinition, CardSuit } from '../../../types';
import { getOpponentId, discardCards } from '../../../services/actions';

export const CUPS_EMPEROR: CardDefinition = {
    id: 'cups-emperor', name: '圣杯·皇帝', suit: CardSuit.CUPS, rank: 104, 
    description: "抽到：观看对方手牌，然后弃置此牌。",
    keywords: [], 
    onDraw: (ctx) => { 
      ctx.setGameState(prev => {
        if (!prev) return null;
        const oppId = getOpponentId(ctx.sourcePlayerId);
        const oppKey = oppId === 1 ? 'player1' : 'player2';
        const handNames = prev[oppKey].hand.map(c => c.name).join(', ');
        ctx.log(`【皇帝】洞察：对手手牌为 [${handNames}]`);
        const ctxDiscard = {...ctx, card: ctx.card};
        discardCards(ctxDiscard, ctx.sourcePlayerId, [ctx.card.instanceId]);
        return prev;
      });
    }
};
