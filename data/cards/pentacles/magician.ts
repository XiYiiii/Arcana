import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { setField, transformCard } from '../../../services/actions';

export const PENTACLES_MAGICIAN: CardDefinition = {
    id: 'pentacles-magician', name: '星币·魔术师', suit: CardSuit.PENTACLES, rank: 401,
    keywords: [Keyword.FIELD, Keyword.TRANSFORM, Keyword.SHUFFLE],
    onReveal: (ctx) => {
        setField(ctx, ctx.card, true);
    },
    onDiscard: (ctx) => {
        const transformRandom = (pid: number) => {
             const p = ctx.gameState[pid === 1 ? 'player1' : 'player2'];
             if (p.hand.length > 0) {
                 const rnd = p.hand[Math.floor(Math.random() * p.hand.length)];
                 transformCard(ctx, pid, rnd.instanceId);
             }
        };
        transformRandom(1);
        transformRandom(2);
    }
};