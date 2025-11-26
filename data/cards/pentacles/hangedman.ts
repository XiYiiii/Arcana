
import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, drawCards } from '../../../services/actions';
import { shuffleDeck } from '../../../services/gameUtils';

export const PENTACLES_HANGEDMAN: CardDefinition = {
    id: 'pentacles-hangedman', name: '星币·倒吊人', suit: CardSuit.PENTACLES, rank: 412,
    keywords: [],
    onReveal: (ctx) => {
        ctx.log("【星币·倒吊人】忍耐！将无效下两次针对己方的[变化]效果。");
        modifyPlayer(ctx, ctx.sourcePlayerId, p => ({ ...p, preventTransform: p.preventTransform + 2 }));
    },
    onDiscard: (ctx) => {
        modifyPlayer(ctx, ctx.sourcePlayerId, p => {
             const justice = p.deck.find(c => c.name.includes('正义'));
             if (justice) {
                 ctx.log(`【星币·倒吊人】寻求公理。检索了 [${justice.name}]。`);
                 const newDeck = p.deck.filter(c => c.instanceId !== justice.instanceId);
                 return { ...p, deck: shuffleDeck(newDeck), hand: [...p.hand, justice] };
             } else {
                 ctx.log("牌堆中未找到【正义】。");
                 return p;
             }
        });
    }
};
