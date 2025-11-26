
import { CardDefinition, CardSuit, Card, Keyword } from '../../../types';
import { modifyPlayer } from '../../../services/actions';

export const CUPS_MOON: CardDefinition = {
    id: 'cups-moon', name: '圣杯·月亮', suit: CardSuit.CUPS, rank: 118,
    description: "打出：清除双方所有牌的标记。每清除一个，恢复2生命。",
    keywords: [Keyword.IMPRINT], // Added to show "Mark" tooltip
    onReveal: (ctx) => {
        let removedCount = 0;
        const clean = (p: any) => {
            const newHand = p.hand.map((c: Card) => {
                if(c.marks.length > 0) { removedCount += c.marks.length; return {...c, marks: []}; }
                return c;
            });
            return {...p, hand: newHand};
        }
        modifyPlayer(ctx, 1, clean);
        modifyPlayer(ctx, 2, clean);
        modifyPlayer(ctx, ctx.sourcePlayerId, p => ({...p, hp: p.hp + removedCount*2}));
    }
};
