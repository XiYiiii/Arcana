import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, getOpponentId, drawCards } from '../../../services/actions';

export const TREASURE_CUPS: CardDefinition = {
  id: 'treasure-cups', name: '宝藏·圣杯', suit: CardSuit.TREASURE, rank: 52, 
  keywords: [Keyword.REVERSE, Keyword.INVALIDATE, Keyword.TREASURE],
  isTreasure: true, canSet: true,
  onResolveStatus: (ctx) => {
    // Logic handled via onReveal interaction for this card
  },
  onReveal: (ctx) => {
    const myHp = ctx.sourcePlayerId === 1 ? ctx.gameState.player1.hp : ctx.gameState.player2.hp;
    const oppId = getOpponentId(ctx.sourcePlayerId);

    ctx.setGameState(prev => ({
      ...prev!,
      interaction: {
        id: `treasure-cups-${Date.now()}`,
        playerId: ctx.sourcePlayerId,
        title: "宝藏·圣杯",
        description: "1. 请输入要献祭的生命值 (n):",
        inputType: 'NUMBER_INPUT',
        min: 1, max: Math.max(1, myHp - 1),
        onConfirm: (n: number) => {
           ctx.setGameState(curr => {
               if(!curr) return null;
               return {
                   ...curr,
                   interaction: {
                       id: `treasure-cups-mode-${Date.now()}`,
                       playerId: ctx.sourcePlayerId,
                       title: "宝藏·圣杯 - 抉择",
                       description: `已献祭 ${n} HP。请选择对敌方卡牌的效果:`,
                       options: [
                           { 
                               label: "反转 (Reverse)", 
                               action: () => {
                                   ctx.log(`[宝藏] 圣杯发动！反转对手！`);
                                   modifyPlayer(ctx, oppId, p => ({ ...p, isReversed: true }));
                                   applySacrifice(ctx, n);
                               }
                           },
                           { 
                               label: "无效 (Invalidate)", 
                               action: () => {
                                   ctx.log(`[宝藏] 圣杯发动！无效对手！`);
                                   modifyPlayer(ctx, oppId, p => ({ ...p, isInvalidated: true }));
                                   applySacrifice(ctx, n);
                               }
                           }
                       ]
                   }
               }
           });
        }
      }
    }));
  }
};

const applySacrifice = (ctx: any, n: number) => {
    modifyPlayer(ctx, ctx.sourcePlayerId, p => ({ ...p, hp: p.hp - n, atk: p.atk + n }));
    setTimeout(() => { drawCards(ctx, ctx.sourcePlayerId, n); }, 50);
    ctx.setGameState((current: any) => current ? ({ ...current, interaction: null }) : null);
};