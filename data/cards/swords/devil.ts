

import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, addMarkToCard, discardField, damagePlayer, getOpponentId } from '../../../services/actions';

export const SWORDS_DEVIL: CardDefinition = {
    id: 'swords-devil', name: '宝剑·恶魔', suit: CardSuit.SWORDS, rank: 315,
    description: "打出：将双方所有手牌标记为“宝剑·恶魔”。\n弃置：清除当前场地。场地所有者受到其自身[Atk]点伤害。\n(标记“宝剑·恶魔”)此牌被打出时，额外对对手造成1点伤害。",
    keywords: [Keyword.IMPRINT],
    onReveal: (ctx) => {
        const markAll = (pid: number) => {
            modifyPlayer(ctx, pid, p => ({
                ...p,
                hand: p.hand.map(c => addMarkToCard(c, 'mark-swords-devil'))
            }));
        };
        markAll(1);
        markAll(2);
        
        // Check self mark effect logic (Since this card is "Played", if it has mark, do dmg)
        if (ctx.card.marks.includes('mark-swords-devil')) {
            damagePlayer(ctx, getOpponentId(ctx.sourcePlayerId), 1);
        }
    },
    onDiscard: (ctx) => {
        if (ctx.gameState.field) {
            const ownerId = ctx.gameState.field.ownerId;
            const atk = ctx.gameState[ownerId === 1 ? 'player1' : 'player2'].atk;
            discardField(ctx);
            damagePlayer(ctx, ownerId, atk);
        }
    }
};
// Note: Mark Logic implementation.
// We need to ensure that *any* card with this mark triggers damage when played.
// Since we don't have a global hook, we rely on individual cards triggering this?
// NO. We need a general solution.
// The best place is `executeResolveEffects` in `reveal.ts` or `onReveal` wrapper.
// But we can't easily change *every* card's onReveal.
// However, in `reveal.ts`, we iterate cards to call `onReveal`. We can check marks there!
// I will update `reveal.ts` to handle generic mark triggers like this.
