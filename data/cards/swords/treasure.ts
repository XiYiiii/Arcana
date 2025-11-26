

import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { damagePlayer, getOpponentId, discardField, checkGameOver } from '../../../services/actions';

export const TREASURE_SWORDS: CardDefinition = {
  id: 'treasure-swords', name: '宝剑', suit: CardSuit.TREASURE, rank: 1, 
  // Description loaded from data/descriptions.ts
  keywords: [Keyword.PIERCE, Keyword.TREASURE],
  isTreasure: true, canSet: true,
  onReveal: (ctx) => {
     discardField(ctx);
     
     const atk = ctx.gameState[ctx.sourcePlayerId === 1 ? 'player1' : 'player2'].atk;
     damagePlayer(ctx, getOpponentId(ctx.sourcePlayerId), 4 * atk, true); 
     
     checkGameOver(ctx);
  }
};