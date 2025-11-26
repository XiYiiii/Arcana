import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer } from '../../../services/actions';
import { TREASURE_WANDS } from './treasure';

export const WANDS_EMPEROR: CardDefinition = {
    id: 'wands-emperor', name: '权杖·皇帝', suit: CardSuit.WANDS, rank: 204,
    keywords: [Keyword.TREASURE],
    onReveal: (ctx) => {
      const treasure = { 
          ...TREASURE_WANDS, 
          instanceId: `treasure-wands-${Date.now()}`, 
          marks: [],
          description: TREASURE_WANDS.description || ""
      };
      modifyPlayer(ctx, ctx.sourcePlayerId, p => ({ ...p, hand: [...p.hand, treasure] }));
    }
};