import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { damagePlayer, getOpponentId } from '../../../services/actions';

export const TREASURE_SWORDS: CardDefinition = {
  id: 'treasure-swords', name: '宝藏·宝剑', suit: CardSuit.TREASURE, rank: 1, 
  description: "打出：造成[4*Atk]伤害，此伤害穿透免疫。\n被动：Rank视为1。\n被动：宝藏(免疫无效/反转/置换/锁定/弃置，不占手牌)。",
  keywords: [Keyword.PIERCE, Keyword.TREASURE],
  isTreasure: true, canSet: true,
  onReveal: (ctx) => {
     const atk = ctx.gameState[ctx.sourcePlayerId === 1 ? 'player1' : 'player2'].atk;
     damagePlayer(ctx, getOpponentId(ctx.sourcePlayerId), 4 * atk, true); 
     
     setTimeout(() => {
         ctx.setGameState(prev => {
             if(!prev) return null;
             const p1 = prev.player1;
             const p2 = prev.player2;
             if(p1.hp <= 0 || p2.hp <= 0) {
                let msg = p1.hp <= 0 && p2.hp <= 0 ? "双方平局！" : p1.hp <= 0 ? "玩家 2 获胜！" : "玩家 1 获胜！";
                return { ...prev, phase: 'GAME_OVER' as any, logs: [msg, ...prev.logs] };
             }
             return prev;
         });
     }, 200);
  }
};