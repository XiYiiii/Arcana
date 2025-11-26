

import { CardDefinition, CardSuit } from '../../../types';
import { damagePlayer, modifyPlayer } from '../../../services/actions';
import { shuffleDeck } from '../../../services/gameUtils';

export const SWORDS_JUSTICE: CardDefinition = {
    id: 'swords-justice', name: '宝剑·正义', suit: CardSuit.SWORDS, rank: 311,
    description: "打出：对方每比自己多1张牌，对对方造成1点伤害。\n弃置：随机从抽牌堆中获取(若有)一张“倒吊人”。",
    keywords: [],
    onReveal: (ctx) => {
        const p1 = ctx.gameState.player1;
        const p2 = ctx.gameState.player2;
        const myHandSize = ctx.sourcePlayerId === 1 ? p1.hand.length : p2.hand.length;
        const oppHandSize = ctx.sourcePlayerId === 1 ? p2.hand.length : p1.hand.length;
        
        const diff = oppHandSize - myHandSize;
        if(diff > 0) {
            ctx.log(`【正义】制裁！手牌差 ${diff}，造成同等伤害。`);
            damagePlayer(ctx, ctx.sourcePlayerId === 1 ? 2 : 1, diff);
        } else {
            ctx.log("【正义】无需制裁。");
        }
    },
    onDiscard: (ctx) => {
        modifyPlayer(ctx, ctx.sourcePlayerId, p => {
            const hangedManIdx = p.deck.findIndex(c => c.name.includes('倒吊人'));
            if(hangedManIdx === -1) {
                ctx.log("未在牌堆中找到【倒吊人】。");
                return p;
            }
            const hangedMan = p.deck[hangedManIdx];
            const newDeck = [...p.deck];
            newDeck.splice(hangedManIdx, 1);
            // Randomly pick? The prompt says "Randomly get a Hanged Man".
            // Since decks are shuffled, picking the first one found is effectively random among copies.
            ctx.log(`【正义】召唤了 [${hangedMan.name}]！`);
            return {
                ...p,
                deck: shuffleDeck(newDeck),
                hand: [...p.hand, hangedMan]
            };
        });
    }
};