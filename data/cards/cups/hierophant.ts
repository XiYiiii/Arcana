
import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, isTreasureInVault } from '../../../services/actions';
import { TREASURE_CUPS } from './treasure';

export const CUPS_HIEROPHANT: CardDefinition = {
    id: 'cups-hierophant', name: '圣杯·教皇', suit: CardSuit.CUPS, rank: 105, 
    keywords: [Keyword.TREASURE],
    onReveal: (ctx) => {
      if (!isTreasureInVault(ctx.gameState, TREASURE_CUPS.id)) {
          ctx.log("【获取失败】[宝藏·圣杯] 已在游戏中，宝库为空。");
          return;
      }
      
      const treasure = { 
          ...TREASURE_CUPS, 
          instanceId: `treasure-cups-${Date.now()}`, 
          marks: [],
          description: TREASURE_CUPS.description || "" 
      };
      ctx.log("【教皇】仪式完成，获得了【宝藏】圣杯！");
      modifyPlayer(ctx, ctx.sourcePlayerId, p => ({ ...p, hand: [...p.hand, treasure] }));
    }
};
