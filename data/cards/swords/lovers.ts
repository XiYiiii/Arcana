import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, drawCards, discardCards, addMarkToCard, getOpponentId } from '../../../services/actions';

export const SWORDS_LOVERS: CardDefinition = {
    id: 'swords-lovers', name: '宝剑·恋人', suit: CardSuit.SWORDS, rank: 306,
    keywords: [Keyword.IMPRINT],
    onDraw: (ctx) => {
        const oppId = getOpponentId(ctx.sourcePlayerId);
        const markRandom = (p: any) => {
            if(p.hand.length === 0) return p.hand;
            const r = Math.floor(Math.random() * p.hand.length);
            return p.hand.map((c:any, i:number) => i === r ? addMarkToCard(c, 'mark-swords-lovers') : c);
        };
        
        modifyPlayer(ctx, ctx.sourcePlayerId, p => ({ ...p, hand: markRandom(p) }));
        modifyPlayer(ctx, oppId, p => ({ ...p, hand: markRandom(p) }));
        
        discardCards(ctx, ctx.sourcePlayerId, [ctx.card.instanceId]);
        drawCards(ctx, ctx.sourcePlayerId, 1);
    }
};