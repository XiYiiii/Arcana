
import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, getOpponentId, drawCards } from '../../../services/actions';

export const TREASURE_CUPS: CardDefinition = {
  id: 'treasure-cups', name: '宝藏·圣杯', suit: CardSuit.TREASURE, rank: 52, 
  description: "打出：献祭己方任意HP，数值为n。己方抽n张牌，下次攻击增加n点伤害，并反转对方。\n被动：宝藏。",
  keywords: [Keyword.REVERSE, Keyword.TREASURE],
  isTreasure: true, canSet: true,
  onResolveStatus: (ctx) => {
    const oppId = getOpponentId(ctx.sourcePlayerId);
    ctx.log(`[宝藏] 圣杯：反转对手！`);
    modifyPlayer(ctx, oppId, p => ({ ...p, isReversed: true }));
  },
  onReveal: (ctx) => {
    const myHp = ctx.sourcePlayerId === 1 ? ctx.gameState.player1.hp : ctx.gameState.player2.hp;
    ctx.setGameState(prev => ({
      ...prev!,
      interaction: {
        id: `treasure-cups-${Date.now()}`,
        playerId: ctx.sourcePlayerId,
        title: "宝藏·圣杯",
        description: "请选择要献祭的生命值 (n)：",
        inputType: 'NUMBER_INPUT',
        min: 1, max: Math.max(1, myHp - 1),
        onConfirm: (n: number) => {
           ctx.log(`[宝藏] 圣杯发动！献祭 ${n} 点生命。`);
           modifyPlayer(ctx, ctx.sourcePlayerId, p => ({ ...p, hp: p.hp - n, atk: p.atk + n }));
           setTimeout(() => { drawCards(ctx, ctx.sourcePlayerId, n); }, 50);
           ctx.setGameState(current => current ? ({ ...current, interaction: null }) : null);
        }
      }
    }));
  }
};
