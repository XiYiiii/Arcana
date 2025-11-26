import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { addQuest, modifyPlayer } from '../../../services/actions';

export const PENTACLES_MOON: CardDefinition = {
    id: 'pentacles-moon', name: '星币·月亮', suit: CardSuit.PENTACLES, rank: 418,
    keywords: [Keyword.QUEST, Keyword.IMPRINT],
    onDraw: (ctx) => {
        addQuest(ctx, ctx.sourcePlayerId, {
            id: 'quest-pentacles-moon',
            name: '星币·月亮',
            description: '打出 3 张标记牌',
            progress: 0,
            target: 3
        });
    },
    onDiscard: (ctx) => {
        modifyPlayer(ctx, ctx.sourcePlayerId, p => ({
            ...p,
            quests: p.quests.filter(q => q.id !== 'quest-pentacles-moon')
        }));
        ctx.log("【星币·月亮】任务已取消。");
    }
};