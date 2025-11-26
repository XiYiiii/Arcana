
import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer } from '../../../services/actions';
import { TREASURE_CUPS } from './treasure';

export const CUPS_HIEROPHANT: CardDefinition = {
    id: 'cups-hierophant', name: '圣杯·教皇', suit: CardSuit.CUPS, rank: 105, 
    description: "打出：从宝库中获取“宝藏·圣杯”。",
    keywords: [Keyword.TREASURE],
    onReveal: (ctx) => {
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
