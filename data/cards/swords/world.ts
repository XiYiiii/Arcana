



import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, addQuest, giveCardReward } from '../../../services/actions';
import { shuffleDeck } from '../../../services/gameUtils';

export const SWORDS_WORLD: CardDefinition = {
    id: 'swords-world', name: '宝剑·世界', suit: CardSuit.SWORDS, rank: 321,
    keywords: [Keyword.QUEST],
    onDraw: (ctx) => {
        ctx.setGameState(prev => ({
            ...prev!,
            interaction: {
                id: `swords-world-draw-${Date.now()}`,
                playerId: ctx.sourcePlayerId,
                title: "宝剑·世界",
                description: "指定一张宝藏牌加入己方宝库（牌堆）：",
                options: [
                    { label: "💎 宝剑", action: () => giveCardReward(ctx, ctx.sourcePlayerId, 'treasure-swords', true) },
                    { label: "💎 圣杯", action: () => giveCardReward(ctx, ctx.sourcePlayerId, 'treasure-cups', true) },
                    { label: "💎 权杖", action: () => giveCardReward(ctx, ctx.sourcePlayerId, 'treasure-wands', true) }
                ]
            }
        }));
    },
    onReveal: (ctx) => {
        const q = {
            id: 'quest-swords-world',
            name: '宝剑·世界',
            description: '造成 10 点伤害',
            progress: 0,
            target: 10
        };
        addQuest(ctx, 1, q);
        addQuest(ctx, 2, q);
    }
};