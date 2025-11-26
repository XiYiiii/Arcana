import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, addMarkToCard, getOpponentId, lockRandomCard } from '../../../services/actions';

export const WANDS_HIEROPHANT: CardDefinition = {
    id: 'wands-hierophant', name: '权杖·教皇', suit: CardSuit.WANDS, rank: 205,
    keywords: [Keyword.IMPRINT, Keyword.INVALIDATE],
    onReveal: (ctx) => {
        modifyPlayer(ctx, ctx.sourcePlayerId, p => {
            const hasEmperor = p.hand.some(c => c.name.includes('皇帝'));
            if (!hasEmperor) return p;
            
            return {
                ...p,
                hand: p.hand.map(c => c.name.includes('皇帝') ? addMarkToCard(c, 'mark-wands-hierophant') : c)
            };
        });
    },
    onDiscard: (ctx) => {
        const oppId = getOpponentId(ctx.sourcePlayerId);
        lockRandomCard(ctx, oppId, 1);
    }
};