import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, isTreasureInVault } from '../../../services/actions';
import { TREASURE_SWORDS } from './treasure';

export const SWORDS_CHARIOT: CardDefinition = {
    id: 'swords-chariot', name: '宝剑·战车', suit: CardSuit.SWORDS, rank: 307,
    keywords: [Keyword.TREASURE],
    onReveal: (ctx) => {
        if (isTreasureInVault(ctx.gameState, TREASURE_SWORDS.id)) {
             ctx.log("【获取失败】[宝藏·宝剑] 已在游戏中，宝库为空。");
             return;
        }

        const treasure = { 
             ...TREASURE_SWORDS, 
             instanceId: `treasure-swords-${Date.now()}`, 
             marks: [],
             description: TREASURE_SWORDS.description || ""
         };
         modifyPlayer(ctx, ctx.sourcePlayerId, p => ({ ...p, hand: [...p.hand, treasure] }));
         ctx.log("【战车】征服！获得了【宝藏·宝剑】！");
    }
};