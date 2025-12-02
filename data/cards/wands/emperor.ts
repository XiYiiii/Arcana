
import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, isTreasureInVault } from '../../../services/actions';
import { TREASURE_WANDS } from './treasure';

export const WANDS_EMPEROR: CardDefinition = {
    id: 'wands-emperor', name: '权杖·皇帝', suit: CardSuit.WANDS, rank: 204,
    keywords: [Keyword.TREASURE],
    onReveal: (ctx) => {
      if (!isTreasureInVault(ctx.gameState, TREASURE_WANDS.id)) {
           ctx.log("【获取失败】[宝藏·权杖] 已在游戏中，宝库为空。");
           return;
      }

      const treasure = { 
          ...TREASURE_WANDS, 
          instanceId: `treasure-wands-${Date.now()}`, 
          marks: [],
          description: TREASURE_WANDS.description || ""
      };
      modifyPlayer(ctx, ctx.sourcePlayerId, p => ({ ...p, hand: [...p.hand, treasure] }));
      ctx.log("【皇帝】加冕！获得了【宝藏·权杖】！");
    }
};
