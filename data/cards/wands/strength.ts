
import { CardDefinition, CardSuit, Keyword, Card } from '../../../types';
import { modifyPlayer, damagePlayer, drawCards, getOpponentId } from '../../../services/actions';

export const WANDS_STRENGTH: CardDefinition = {
    id: 'wands-strength', name: '权杖·力量', suit: CardSuit.WANDS, rank: 208,
    description: "打出：抽取3张牌并无效后丢弃。每有1张“圣杯”弃1张牌；每有1张“宝剑”造成2点伤害；每有1张“权杖”抽1张牌；每有1张“星币”由对方交换1张手牌。",
    keywords: [Keyword.INVALIDATE],
    onReveal: (ctx) => {
       const oppId = getOpponentId(ctx.sourcePlayerId);
       let drawnCards: Card[] = [];
       modifyPlayer(ctx, ctx.sourcePlayerId, p => {
           drawnCards = p.deck.slice(0, 3);
           return { ...p, deck: p.deck.slice(3), discardPile: [...p.discardPile, ...drawnCards] };
       });
       if (drawnCards.length === 0) return;
       let cups = 0, swords = 0, wands = 0, pentacles = 0;
       drawnCards.forEach(c => {
           if (c.suit === CardSuit.CUPS) cups++;
           if (c.suit === CardSuit.SWORDS) swords++;
           if (c.suit === CardSuit.WANDS) wands++;
           if (c.suit === CardSuit.PENTACLES) pentacles++;
       });
       ctx.log(`转化: 🏆${cups} ⚔️${swords} 🪄${wands} 🪙${pentacles}`);
       if (swords > 0) damagePlayer(ctx, oppId, 2 * swords);
       if (wands > 0) drawCards(ctx, ctx.sourcePlayerId, wands);
    }
};
