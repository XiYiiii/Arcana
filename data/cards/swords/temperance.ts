

import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { addQuest, getOpponentId, discardCards } from '../../../services/actions';

export const SWORDS_TEMPERANCE: CardDefinition = {
    id: 'swords-temperance', name: '宝剑·节制', suit: CardSuit.SWORDS, rank: 314,
    description: "打出：己方获得任务“宝剑·节制”。\n弃置：随机弃置对方一张手牌。\n(任务“宝剑·节制”)弃置八张牌以完成此任务。任务完成时，这局对战中己方手牌上限+1。",
    keywords: [Keyword.QUEST],
    onReveal: (ctx) => {
        addQuest(ctx, ctx.sourcePlayerId, {
            id: 'quest-swords-temperance',
            name: '宝剑·节制',
            description: '弃置 8 张牌',
            progress: 0,
            target: 8
        });
    },
    onDiscard: (ctx) => {
        const oppId = getOpponentId(ctx.sourcePlayerId);
        const oppHand = ctx.gameState[oppId === 1 ? 'player1' : 'player2'].hand;
        if(oppHand.length > 0) {
            const randIdx = Math.floor(Math.random() * oppHand.length);
            const card = oppHand[randIdx];
            const ctxDisc = { ...ctx, card }; // Context for discard
            discardCards(ctxDisc, oppId, [card.instanceId]);
            ctx.log(`【宝剑·节制】随机弃置了对手的 [${card.name}]。`);
        }
    }
};