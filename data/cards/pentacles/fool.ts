import { CardDefinition, CardSuit, InstantWindow, Keyword } from '../../../types';
import { addQuest, blindSeize, transformCard, setField, getOpponentId } from '../../../services/actions';

export const PENTACLES_FOOL: CardDefinition = {
    id: 'pentacles-fool', name: '星币·愚者', suit: CardSuit.PENTACLES, rank: 400,
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