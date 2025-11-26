
import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { damagePlayer } from '../../../services/actions';

export const CUPS_CHARIOT: CardDefinition = {
    id: 'cups-chariot', name: '圣杯·战车', suit: CardSuit.CUPS, rank: 107, 
    description: "打出：双方各抽1张牌进行拼点。若点数相同，对双方造成[Atk]点伤害；否则由点数大者对点数小者造成[Atk]点伤害。",
    keywords: [Keyword.CLASH],
    onReveal: (ctx) => {
       ctx.log("【战车】冲锋！进行序号拼点...");
       const p1Deck = ctx.gameState.player1.deck;
       const p2Deck = ctx.gameState.player2.deck;
       const r1 = p1Deck[0] ? p1Deck[0].rank : 999;
       const r2 = p2Deck[0] ? p2Deck[0].rank : 999;
       ctx.log(`拼点结果: P1[${p1Deck[0]?.rank}] vs P2[${p2Deck[0]?.rank}]`);
       const p1Atk = ctx.gameState.player1.atk;
       const p2Atk = ctx.gameState.player2.atk;
       if (r1 === r2) {
           damagePlayer(ctx, 1, p2Atk); damagePlayer(ctx, 2, ctx.sourcePlayerId === 1 ? p1Atk : p2Atk);
       } else {
           const winnerId = r1 > r2 ? 1 : 2;
           const loserId = winnerId === 1 ? 2 : 1;
           const dmgSourceAtk = winnerId === 1 ? p1Atk : p2Atk;
           damagePlayer(ctx, loserId, dmgSourceAtk);
       }
    }
};
