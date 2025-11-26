
import { CardDefinition, CardSuit, Keyword, InstantWindow } from '../../../types';
import { modifyPlayer, transformCard } from '../../../services/actions';

export const PENTACLES_WORLD: CardDefinition = {
    id: 'pentacles-world', name: '星币·世界', suit: CardSuit.PENTACLES, rank: 421,
    keywords: [Keyword.PIERCE, Keyword.TRANSFORM],
    onReveal: (ctx) => {
        ctx.log(`【星币·世界】法则改写！下一回合所有伤害将变为穿透伤害。`);
        modifyPlayer(ctx, 1, p => ({ ...p, piercingDamageNextTurn: true }));
        modifyPlayer(ctx, 2, p => ({ ...p, piercingDamageNextTurn: true }));
    },
    canInstant: (w) => w === InstantWindow.BEFORE_REVEAL,
    onInstant: (ctx) => {
        const p = ctx.gameState[ctx.sourcePlayerId === 1 ? 'player1' : 'player2'];
        if (p.fieldSlot) {
            transformCard(ctx, ctx.sourcePlayerId, p.fieldSlot.instanceId);
            ctx.log(`【星币·世界】重塑了现实！`);
        } else {
            ctx.log("【星币·世界】场上无牌可变化。");
        }
    }
};
