

import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { addMarkToCard, modifyPlayer } from '../../../services/actions';

export const WANDS_EMPRESS: CardDefinition = {
    id: 'wands-empress', name: '权杖·女皇', suit: CardSuit.WANDS, rank: 203,
    keywords: [Keyword.IMPRINT],
    onReveal: (ctx) => {
        ctx.setGameState(prev => {
            if(!prev) return null;
            const key = ctx.sourcePlayerId === 1 ? 'player1' : 'player2';
            return {
                ...prev,
                interaction: {
                    id: `wands-empress-mark-${Date.now()}`,
                    playerId: ctx.sourcePlayerId,
                    title: "权杖·女皇",
                    description: "选择一张手牌添加标记:",
                    inputType: 'CARD_SELECT',
                    cardsToSelect: prev[key].hand,
                    onCardSelect: (c) => {
                        modifyPlayer(ctx, ctx.sourcePlayerId, p => ({
                            ...p,
                            hand: p.hand.map(h => h.instanceId === c.instanceId ? addMarkToCard(h, 'mark-wands-empress') : h)
                        }));
                        ctx.setGameState(curr => curr ? ({...curr, interaction: null}) : null);
                    }
                }
            };
        });
    }
};