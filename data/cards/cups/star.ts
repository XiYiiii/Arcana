import { CardDefinition, CardSuit } from '../../../types';
import { modifyPlayer, discardCards } from '../../../services/actions';

export const CUPS_STAR: CardDefinition = {
    id: 'cups-star', name: '圣杯·星星', suit: CardSuit.CUPS, rank: 117,
    keywords: [],
    onDraw: (ctx) => {
        const hand = ctx.gameState[ctx.sourcePlayerId===1?'player1':'player2'].hand;
        const sunOrMoon = hand.find(c => c.name.includes('圣杯·太阳') || c.name.includes('圣杯·月亮'));
        
        if (sunOrMoon) {
            ctx.log("【星星】共鸣！打出日月。");
            if(sunOrMoon.onReveal) sunOrMoon.onReveal({...ctx, card: sunOrMoon});
        } else {
            ctx.setGameState(prev => ({
                ...prev!,
                interaction: {
                    id: `star-choice-${Date.now()}`,
                    playerId: ctx.sourcePlayerId,
                    title: "圣杯·星星",
                    description: "选择去向:",
                    options: [
                        { label: "置于堆底", action: () => {
                            modifyPlayer(ctx, ctx.sourcePlayerId, p => ({
                                ...p, hand: p.hand.filter(c=>c.instanceId!==ctx.card.instanceId), deck: [...p.deck, ctx.card]
                            }));
                            ctx.setGameState(s=>s?({...s,interaction:null}):null);
                        }},
                        { label: "弃置", action: () => {
                            discardCards(ctx, ctx.sourcePlayerId, [ctx.card.instanceId]);
                            ctx.setGameState(s=>s?({...s,interaction:null}):null);
                        }}
                    ]
                }
            }));
        }
    }
};