import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { blindSeize, transformCard, getOpponentId, modifyPlayer, addMarkToCard } from '../../../services/actions';

export const PENTACLES_LOVERS: CardDefinition = {
    id: 'pentacles-lovers', name: '星币·恋人', suit: CardSuit.PENTACLES, rank: 406,
    keywords: [Keyword.BLIND_SEIZE, Keyword.TRANSFORM, Keyword.IMPRINT],
    onDraw: (ctx) => {
        blindSeize(ctx, 1);
        setTimeout(() => {
             const oppId = getOpponentId(ctx.sourcePlayerId);
             // Move to opponent hand
             modifyPlayer(ctx, ctx.sourcePlayerId, p => ({...p, hand: p.hand.filter(c => c.instanceId !== ctx.card.instanceId)}));
             modifyPlayer(ctx, oppId, p => ({...p, hand: [...p.hand, ctx.card]}));
             
             // Transform it
             setTimeout(() => transformCard(ctx, oppId, ctx.card.instanceId), 100);
        }, 300);
    },
    onReveal: (ctx) => {
        const markRandom = (pid: number) => {
            modifyPlayer(ctx, pid, p => {
                if (p.hand.length === 0) return p;
                const r = Math.floor(Math.random() * p.hand.length);
                return { ...p, hand: p.hand.map((c, i) => i === r ? addMarkToCard(c, 'mark-pentacles-lovers') : c) };
            });
        };
        markRandom(1);
        markRandom(2);
    }
};