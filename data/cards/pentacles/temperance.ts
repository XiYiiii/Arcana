import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, isTreasureInVault } from '../../../services/actions';
import { TREASURE_PENTACLES } from './treasure';

export const PENTACLES_TEMPERANCE: CardDefinition = {
    id: 'pentacles-temperance', name: '星币·节制', suit: CardSuit.PENTACLES, rank: 414,
    keywords: [Keyword.TREASURE],
    onReveal: (ctx) => {
      if (isTreasureInVault(ctx.gameState, TREASURE_PENTACLES.id)) {
           ctx.log("【获取失败】[宝藏·星币] 已在游戏中，宝库为空。");
           return;
      }
      
      const treasure = { 
          ...TREASURE_PENTACLES, 
          instanceId: `treasure-pentacles-${Date.now()}`, 
          marks: [],
          description: TREASURE_PENTACLES.description || ""
      };
      modifyPlayer(ctx, ctx.sourcePlayerId, p => ({ ...p, hand: [...p.hand, treasure] }));
      ctx.log("【星币·节制】炼成！获得了【宝藏·星币】！");
    }
};