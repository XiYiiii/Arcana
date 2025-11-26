import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, damagePlayer, addMarkToCard, getOpponentId } from '../../../services/actions';

export const SWORDS_HIEROPHANT: CardDefinition = {
    id: 'swords-hierophant', name: '宝剑·教皇', suit: CardSuit.SWORDS, rank: 305,
    keywords: [Keyword.IMPRINT],
    onReveal: (ctx) => {
        modifyPlayer(ctx, ctx.sourcePlayerId, p => ({
            ...p, hand: p.hand.map(c => addMarkToCard(c, 'mark-swords-hierophant'))
        }));
        
        // Check if this card itself was marked (from previous Hierophant)
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
        
        // Self-damage logic for the Hierophant card itself if marked is now handled globally in discardCards.
    }
};