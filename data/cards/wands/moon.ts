
import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, getOpponentId } from '../../../services/actions';

export const WANDS_MOON: CardDefinition = {
    id: 'wands-moon', name: '权杖·月亮', suit: CardSuit.WANDS, rank: 218,
    description: "【弃置】这张牌进入对手的手牌。\n【被动】若此牌在手中，且对方打出了一张“插入使用”的牌，无效并弃置那张牌，然后销毁此牌。",
    keywords: [Keyword.INVALIDATE],
    onDiscard: (ctx) => {
        modifyPlayer(ctx, getOpponentId(ctx.sourcePlayerId), p => ({ ...p, hand: [...p.hand, ctx.card] }));
        const myKey = ctx.sourcePlayerId === 1 ? 'player1' : 'player2';
        ctx.setGameState(prev => {
            if(!prev) return null;
            const me = prev[myKey];
            // Remove from my discard, it went to opp hand
            return {
                ...prev,
                [myKey]: { ...me, discardPile: me.discardPile.filter(c => c.instanceId !== ctx.card.instanceId) }
            };
        });
    }
};
