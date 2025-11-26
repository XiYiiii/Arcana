

import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, getOpponentId, drawCards } from '../../../services/actions';

export const TREASURE_CUPS: CardDefinition = {
  id: 'treasure-cups', name: '宝藏·圣杯', suit: CardSuit.TREASURE, rank: 52, 
  description: "打出：取一个n，然后扣除己方n点HP，抽n张牌，下次攻击增加n点伤害。选择：反转或无效对方打出的牌。\n被动：宝藏牌(无法被无效，反转，置换，锁定，弃置，不占手牌上限)。",
  keywords: [Keyword.REVERSE, Keyword.INVALIDATE, Keyword.TREASURE],
  isTreasure: true, canSet: true,
  onResolveStatus: (ctx) => {
    // This hook runs before main reveal. We can handle the "Invalidate/Reverse" choice here?
    // Or do it in onReveal. The prompt says "Play: ... Choose: Reverse or Invalidate".
    // Usually ResolveStatus handles Invalidate/Reverse priorities.
    // If we wait for onReveal, it might be too late for Invalidate to stop opponent's ResolveStatus?
    // Actually, onResolveStatus is specifically for Reverse/Invalidate effects.
    // Let's prompt here.
    
    // However, prompts are async/UI based. onResolveStatus is usually synchronous logic in the phase loop.
    // If we allow interaction here, it pauses the flow. Our architecture supports `await` in `executeResolveEffects` loop, but
    // `interaction` sets state and returns. It breaks the flow if not handled carefully.
    // Given the complexity, let's implement the default choice (Reverse) or simple logic?
    // The prompt implies a choice.
    // Let's do the interaction in onReveal, and accept that "Invalidate" might apply late or to the *effect* part, not stopping opponent's *onResolveStatus*.
    // BUT, "Invalidate opponent's played card" usually means preventing their Effect.
    // Let's put the choice in onReveal.
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