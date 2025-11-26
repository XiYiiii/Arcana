

import { CardDefinition, CardSuit, InstantWindow, Keyword } from '../../../types';
import { addQuest, blindSeize, transformCard, setField, getOpponentId } from '../../../services/actions';

export const PENTACLES_FOOL: CardDefinition = {
    id: 'pentacles-fool', name: '星币·愚者', suit: CardSuit.PENTACLES, rank: 400,
    description: "抽到：获得任务“星币·愚者”。\n打出：己方盲夺对方2张牌，并标记为“星币·愚者”；然后对方盲夺己方2张牌。\n插入(置牌前)：变化手牌中的所有牌。\n弃置：设置场地为“星币·愚者”。\n(标记“星币·愚者”)这张牌无法被盲夺。\n(任务“星币·愚者”)变化3张牌后完成此任务。任务完成时，选择：变化手牌中的所有牌，或者打乱己方抽牌堆，然后抽取一张牌。\n(场地“星币·愚者”)每当2张牌被变化后，激活此场地。当此场地被激活时，下一张被抽到的牌将被变化，然后此场地回到未被激活的状态。",
    keywords: [Keyword.IMPRINT, Keyword.QUEST, Keyword.BLIND_SEIZE, Keyword.TRANSFORM, Keyword.FIELD],
    onDraw: (ctx) => {
        addQuest(ctx, ctx.sourcePlayerId, {
            id: 'quest-pentacles-fool',
            name: '星币·愚者',
            description: '变化 3 张牌',
            progress: 0,
            target: 3
        });
    },
    onReveal: (ctx) => {
        const oppId = getOpponentId(ctx.sourcePlayerId);
        
        ctx.log("【星币·愚者】交换仪式开始！");
        // My seize (mark them)
        blindSeize(ctx, 2, 'mark-pentacles-fool');
        
        // Opponent seize (standard)
        const oppCtx = { ...ctx, sourcePlayerId: oppId };
        setTimeout(() => {
             ctx.log("【星币·愚者】对方回夺！");
             blindSeize(oppCtx, 2);
        }, 300);
    },
    canInstant: (w) => w === InstantWindow.BEFORE_SET,
    onInstant: (ctx) => {
        const p = ctx.gameState[ctx.sourcePlayerId === 1 ? 'player1' : 'player2'];
        p.hand.forEach(c => {
             transformCard(ctx, ctx.sourcePlayerId, c.instanceId);
        });
    },
    onDiscard: (ctx) => {
        setField(ctx, ctx.card);
    }
};
