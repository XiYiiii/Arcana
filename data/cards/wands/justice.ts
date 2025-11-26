import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, getOpponentId, addMarkToCard } from '../../../services/actions';

export const WANDS_JUSTICE: CardDefinition = {
    id: 'wands-justice', name: '权杖·正义', suit: CardSuit.WANDS, rank: 211,
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