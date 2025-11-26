import { CardDefinition, CardSuit, Keyword } from '../../../types';

export const WANDS_TEMPERANCE: CardDefinition = {
    id: 'wands-temperance', name: '权杖·节制', suit: CardSuit.WANDS, rank: 214,
    keywords: [Keyword.INVALIDATE],
    onReveal: (ctx) => {
        // Set both flags atomically to ensure consistency
        ctx.setGameState(prev => {
            if (!prev) return null;
            return {
                ...prev,
                player1: { ...prev.player1, invalidateNextTurn: true },
                player2: { ...prev.player2, invalidateNextTurn: true }
            };
        });
        ctx.log("【节制】平衡！双方下一轮打出的牌将被无效。");
    }
};