

import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { damagePlayer, drawCards, addQuest } from '../../../services/actions';

export const CUPS_CHARIOT: CardDefinition = {
    id: 'cups-chariot', name: '圣杯·战车', suit: CardSuit.CUPS, rank: 107, 
    description: "打出：从双方抽牌堆顶端抽取一张牌并进行拼点，若双方相同则对双方造成[Atk]点伤害，否则由序号大者对序号小者造成[Atk]点伤害。\n弃置：己方获得任务“圣杯·战车”。\n(任务“圣杯·战车”)抽十张牌以完成此任务。任务完成后对对方造成[Atk]点伤害。",
    keywords: [Keyword.CLASH, Keyword.QUEST],
    onReveal: (ctx) => {
       ctx.log("【战车】冲锋！抽取顶牌拼点...");
       // Note: drawCards moves card to hand. We'll use the newly drawn cards for comparison.
       // However, drawCards is async in state. We need to look at deck state BEFORE draw for logic, but consume them.
       // Simplest: Call drawCards(1), then timeout to check the NEW last card in hand.
       
       drawCards(ctx, 1, 1);
       drawCards(ctx, 2, 1);
       
       setTimeout(() => {
           ctx.setGameState(prev => {
               if(!prev) return null;
               const p1 = prev.player1;
               const p2 = prev.player2;
               // Drawn cards are at the end of hand
               const c1 = p1.hand[p1.hand.length - 1];
               const c2 = p2.hand[p2.hand.length - 1];
               
               if(!c1 || !c2) return prev; // Should not happen if deck had cards
               
               const r1 = c1.rank;
               const r2 = c2.rank;
               const p1Atk = p1.atk;
               const p2Atk = p2.atk;
               
               ctx.log(`拼点: P1[${c1.name}(${r1})] vs P2[${c2.name}(${r2})]`);
               
               // We need to trigger damage. damagePlayer is an action wrapper, tricky inside setGameState.
               // We'll queue the damage via visual helper or timeout. 
               // Better: Execute damage in another timeout or use logic that doesn't rely on prev state strictly inside here.
               // Let's use the timeout approach outside of this setter for damage application.
               // But we need to calculate it here.
               
               let dmgAction = () => {};
               if (r1 === r2) {
                   dmgAction = () => { damagePlayer(ctx, 1, p2Atk); damagePlayer(ctx, 2, p1Atk); };
               } else if (r1 > r2) {
                   dmgAction = () => { damagePlayer(ctx, 2, p1Atk); };
               } else {
                   dmgAction = () => { damagePlayer(ctx, 1, p2Atk); };
               }
               
               setTimeout(dmgAction, 200);
               return prev;
           });
       }, 500);
    },
    onDiscard: (ctx) => {
        addQuest(ctx, ctx.sourcePlayerId, {
            id: 'quest-cups-chariot',
            name: '圣杯·战车',
            description: '抽 10 张牌',
            progress: 0,
            target: 10
        });
    }
};