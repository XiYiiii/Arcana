
import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, drawCards, discardCards, addMarkToCard, getOpponentId } from '../../../services/actions';

export const SWORDS_LOVERS: CardDefinition = {
    id: 'swords-lovers', name: '宝剑·恋人', suit: CardSuit.SWORDS, rank: 306,
    description: "抽到：标记双方的各一张手牌为“宝剑·恋人”，弃置此牌，抽一张牌。\n印记(宝剑·恋人)：这张牌在手上时，每对对方造成1次伤害，对己方造成1点伤害。",
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
