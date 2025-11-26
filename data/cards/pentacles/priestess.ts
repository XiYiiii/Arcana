
import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { addQuest, modifyPlayer, putCardInDeck } from '../../../services/actions';

export const PENTACLES_PRIESTESS: CardDefinition = {
    id: 'pentacles-priestess', name: '星币·女祭司', suit: CardSuit.PENTACLES, rank: 402,
    description: "抽到：己方获得任务“星币·女祭司”。\n打出：占卜己方的三张牌，其中：每有一张“圣杯”，恢复1点Hp，每有一张“宝剑”，扣除1点Hp。\n弃置：己方取消任务“星币·女祭司”。\n(任务“星币·女祭司”)己方受到10点Hp后完成此任务。占卜己方五张牌，将其中任意张移动到牌堆底。",
    keywords: [Keyword.QUEST, Keyword.SCRY],
    onDraw: (ctx) => {
        addQuest(ctx, ctx.sourcePlayerId, {
            id: 'quest-pentacles-priestess',
            name: '星币·女祭司',
            description: '承受 10 点伤害',
            progress: 0,
            target: 10
        });
    },
    onReveal: (ctx) => {
        const deck = ctx.gameState[ctx.sourcePlayerId === 1 ? 'player1' : 'player2'].deck;
        const toScry = deck.slice(0, 3);
        
        ctx.log(`【星币·女祭司】占卜：${toScry.map(c=>c.name).join(', ')}`);
        
        let heal = 0;
        let dmg = 0;
        toScry.forEach(c => {
            if (c.suit === CardSuit.CUPS) heal++;
            if (c.suit === CardSuit.SWORDS) dmg++;
        });
        
        if (heal > 0 || dmg > 0) {
            modifyPlayer(ctx, ctx.sourcePlayerId, p => ({ ...p, hp: p.hp + heal - dmg }));
            ctx.log(`【星币·女祭司】结果：恢复 ${heal} HP，扣除 ${dmg} HP。`);
        }
    },
    onDiscard: (ctx) => {
        modifyPlayer(ctx, ctx.sourcePlayerId, p => ({
            ...p,
            quests: p.quests.filter(q => q.id !== 'quest-pentacles-priestess')
        }));
        ctx.log("【星币·女祭司】任务已取消。");
    }
};
