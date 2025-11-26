

import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, addQuest } from '../../../services/actions';

export const WANDS_STAR: CardDefinition = {
    id: 'wands-star', name: '权杖·星星', suit: CardSuit.WANDS, rank: 217,
    description: "打出：占卜己方的一张牌，选择是否将其与“权杖·月亮”或“权杖·太阳”交换（若这两张牌在抽牌堆中）。\n弃置：己方获得任务“权杖·星星”。\n(任务“权杖·星星”)手牌中同时有“太阳”和“月亮”时完成。任务完成时，选择任意一张“太阳”、“月亮”、“星星”，直接置入手牌。",
    keywords: [Keyword.SCRY, Keyword.QUEST],
    onReveal: (ctx) => {
        ctx.setGameState(prev => ({
            ...prev!,
            interaction: {
                id: `star-search-${Date.now()}`,
                playerId: ctx.sourcePlayerId,
                title: "权杖·星星",
                description: "检索 太阳 或 月亮 :",
                inputType: 'CARD_SELECT',
                cardsToSelect: prev![ctx.sourcePlayerId===1?'player1':'player2'].deck.filter(c => c.name.includes('太阳') || c.name.includes('月亮')),
                options: [{label:"不交换", action:()=>ctx.setGameState(s=>s?({...s,interaction:null}):null)}],
                onCardSelect: (c) => {
                    modifyPlayer(ctx, ctx.sourcePlayerId, p => {
                        const newDeck = p.deck.filter(x => x.instanceId !== c.instanceId);
                        return {
                            ...p,
                            deck: [...newDeck, ctx.card], // Star goes back to deck
                            fieldSlot: c // Sun/Moon becomes the played card
                        };
                    });
                    ctx.log(`【星星】退隐，[${c.name}] 降临！`);
                    ctx.setGameState(s=>s?({...s,interaction:null}):null);
                }
            }
        }));
    },
    onDiscard: (ctx) => {
        addQuest(ctx, ctx.sourcePlayerId, {
            id: 'quest-wands-star',
            name: '权杖·星星',
            description: '集齐日月',
            progress: 0, // Boolean check effectively
            target: 1 // Completed instantly if condition met
        });
    }
};