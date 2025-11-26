

import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { damagePlayer, getOpponentId, discardField, checkGameOver } from '../../../services/actions';

export const TREASURE_SWORDS: CardDefinition = {
  id: 'treasure-swords', name: '宝剑', suit: CardSuit.TREASURE, rank: 1, 
  description: "打出：弃置场上的场地，造成[4*Atk]伤害，这次伤害无法被以任何方式免疫。\n被动：这张牌的特效被触发之后，立刻判断游戏是否结束。\n被动：这张卡的优先级视为1。\n被动：宝藏牌(无法被无效，反转，置换，锁定，弃置，不占手牌上限)。",
  keywords: [Keyword.PIERCE, Keyword.TREASURE],
  isTreasure: true, canSet: true,
  onReveal: (ctx) => {
     discardField(ctx);
     
     const atk = ctx.gameState[ctx.sourcePlayerId === 1 ? 'player1' : 'player2'].atk;
     damagePlayer(ctx, getOpponentId(ctx.sourcePlayerId), 4 * atk, true); 
     
     checkGameOver(ctx);
  }
};