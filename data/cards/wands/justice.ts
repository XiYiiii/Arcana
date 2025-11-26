
import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, getOpponentId, addMarkToCard } from '../../../services/actions';

export const WANDS_JUSTICE: CardDefinition = {
    id: 'wands-justice', name: '权杖·正义', suit: CardSuit.WANDS, rank: 211,
    description: "抽到：向对方展示这张牌。\n打出：随机将对方一张手牌标记为“权杖·正义”。\n印记(权杖·正义)：若这张牌在手牌中，则只能打出这张牌。",
    keywords: [Keyword.IMPRINT],
    onDraw: (ctx) => { ctx.log(`【正义】被抽到了！公之于众！`); },
    onReveal: (ctx) => {
        const oppId = getOpponentId(ctx.sourcePlayerId);
        modifyPlayer(ctx, oppId, p => {
            if(p.hand.length === 0) return p;
            const randIdx = Math.floor(Math.random() * p.hand.length);
            return { ...p, hand: p.hand.map((c, i) => i === randIdx ? addMarkToCard(c, 'mark-justice') : c) };
        });
    }
};
