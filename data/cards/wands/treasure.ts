

import { CardDefinition, CardSuit, Keyword, Card } from '../../../types';
import { modifyPlayer, getOpponentId, seizeCard } from '../../../services/actions';

export const TREASURE_WANDS: CardDefinition = {
  id: 'treasure-wands', name: '宝藏·权杖', suit: CardSuit.TREASURE, rank: 53,
  description: "打出：观看对方手牌，夺取其中任意张，本回合己方不弃牌，己方的手牌上限永久+2。\n被动：宝藏牌(无法被无效，反转，置换，锁定，弃置，不占手牌上限)。",
  keywords: [Keyword.SEIZE, Keyword.TREASURE],
  isTreasure: true, canSet: true,
  onReveal: (ctx) => {
      const oppId = getOpponentId(ctx.sourcePlayerId);
      const oppKey = oppId === 1 ? 'player1' : 'player2';
      
      modifyPlayer(ctx, ctx.sourcePlayerId, p => ({ ...p, maxHandSize: p.maxHandSize + 2, skipDiscardThisTurn: true }));
      
      const startSeize = (currentState: any) => {
          const oppHand = currentState[oppKey].hand;
          if(oppHand.length === 0) {
              ctx.log("对手无手牌可夺取。");
              return { ...currentState, interaction: null };
          }
          return {
              ...currentState,
              interaction: {
                  id: `wands-seize-${Date.now()}`,
                  playerId: ctx.sourcePlayerId,
                  title: "宝藏·权杖 - 夺取",
                  description: "选择一张牌夺取 (可多次夺取):",
                  inputType: 'CARD_SELECT',
                  cardsToSelect: oppHand,
                  options: [{ label: "结束夺取", action: () => ctx.setGameState((curr: any) => curr ? ({...curr, interaction: null}) : null) }],
                  onCardSelect: (c: Card) => {
                      seizeCard(ctx, c.instanceId);
                      setTimeout(() => {
                          ctx.setGameState((prev:any) => startSeize(prev));
                      }, 100);
                  }
              }
          };
      };
      
      ctx.setGameState(prev => {
         if(!prev) return null;
         return startSeize(prev);
      });
  }
};