
import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { drawCards } from '../../../services/actions';

export const WANDS_CHARIOT: CardDefinition = {
    id: 'wands-chariot', name: '权杖·战车', suit: CardSuit.WANDS, rank: 207,
    description: "打出：双方各抽1张牌进行拼点。若点数相同，双方各抽1张牌；否则由点数大者抽1张牌。",
    keywords: [Keyword.CLASH],
    onReveal: (ctx) => {
       const p1Deck = ctx.gameState.player1.deck;
       const p2Deck = ctx.gameState.player2.deck;
       drawCards(ctx, 1, 1); drawCards(ctx, 2, 1);
       setTimeout(() => {
           const r1 = p1Deck[0] ? p1Deck[0].rank : -1;
           const r2 = p2Deck[0] ? p2Deck[0].rank : -1;
           if (r1 === r2) {
                drawCards(ctx, 1, 1); drawCards(ctx, 2, 1);
           } else {
                drawCards(ctx, r1 > r2 ? 1 : 2, 1);
           }
       }, 500);
    }
};
