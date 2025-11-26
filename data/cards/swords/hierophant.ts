
import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, damagePlayer, addMarkToCard, getOpponentId } from '../../../services/actions';

export const SWORDS_HIEROPHANT: CardDefinition = {
    id: 'swords-hierophant', name: '宝剑·教皇', suit: CardSuit.SWORDS, rank: 305,
    description: "打出：标记手牌中的所有牌为“宝剑·教皇”。\n弃置：随机标记对手手牌中的两张牌为“宝剑·教皇”。\n印记(宝剑·教皇)：这张牌被打出时，对对方造成[Atk]点伤害；被弃置时，对己方造成[Atk]点伤害。",
    keywords: [Keyword.IMPRINT],
    onReveal: (ctx) => {
        modifyPlayer(ctx, ctx.sourcePlayerId, p => ({
            ...p, hand: p.hand.map(c => addMarkToCard(c, 'mark-swords-hierophant'))
        }));
        // Trigger mark effect for self? "When this card is played..."
        // Since this card itself might not have the mark yet when played (unless marked previously),
        // we check if it has mark. If it was just played, it triggered this effect.
        // We need a generic Mark Trigger check.
        // For now, let's just apply the mark to hand.
        // AND check if *this* card has the mark (from previous Hierophant).
        if(ctx.card.marks.includes('mark-swords-hierophant')) {
             const atk = ctx.gameState[ctx.sourcePlayerId===1?'player1':'player2'].atk;
             damagePlayer(ctx, getOpponentId(ctx.sourcePlayerId), atk);
        }
    },
    onDiscard: (ctx) => {
        const oppId = getOpponentId(ctx.sourcePlayerId);
        modifyPlayer(ctx, oppId, p => {
            if(p.hand.length === 0) return p;
            const indices = p.hand.map((_, i) => i);
            const chosen: number[] = [];
            for(let i=0; i<2 && indices.length; i++) {
                const r = Math.floor(Math.random()*indices.length);
                chosen.push(indices[r]);
                indices.splice(r, 1);
            }
            return { ...p, hand: p.hand.map((c, i) => chosen.includes(i) ? addMarkToCard(c, 'mark-swords-hierophant') : c) };
        });

        if(ctx.card.marks.includes('mark-swords-hierophant')) {
             const atk = ctx.gameState[ctx.sourcePlayerId===1?'player1':'player2'].atk;
             damagePlayer(ctx, ctx.sourcePlayerId, atk);
        }
    }
};
