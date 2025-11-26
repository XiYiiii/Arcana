
import { CardDefinition, CardSuit } from '../../../types';

export const WANDS_EMPRESS: CardDefinition = {
    id: 'wands-empress', name: '权杖·女皇', suit: CardSuit.WANDS, rank: 203,
    description: "打出：将手牌中任意一张牌的“抽到”效果变为“打出”效果触发。",
    keywords: [],
    onReveal: (ctx) => {
        ctx.setGameState(prev => {
            if(!prev) return null;
            const key = ctx.sourcePlayerId === 1 ? 'player1' : 'player2';
            return {
                ...prev,
                interaction: {
                    id: `empress-${Date.now()}`,
                    playerId: ctx.sourcePlayerId,
                    title: "权杖·女皇",
                    description: "选择一张手牌触发其【抽到】效果:",
                    inputType: 'CARD_SELECT',
                    cardsToSelect: prev[key].hand,
                    onCardSelect: (c) => {
                        if(c.onDraw) c.onDraw(ctx);
                        else ctx.log("该卡牌无抽到效果。");
                        ctx.setGameState(curr => curr ? ({...curr, interaction: null}) : null);
                    }
                }
            };
        });
    }
};
