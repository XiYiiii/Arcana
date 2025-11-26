
import { CardDefinition, CardSuit, Keyword } from '../../../types';

export const WANDS_TEMPERANCE: CardDefinition = {
    id: 'wands-temperance', name: '权杖·节制', suit: CardSuit.WANDS, rank: 214,
    description: "打出：无效双方打出的下一张牌。",
    keywords: [Keyword.INVALIDATE],
    onReveal: (ctx) => {
        // Set both flags atomically to ensure consistency
        ctx.setGameState(prev => {
            if (!prev) return null;
            return {
                ...prev,
                player1: { ...prev.player1, invalidateNextPlayedCard: true },
                player2: { ...prev.player2, invalidateNextPlayedCard: true }
            };
        });
        ctx.log("【节制】平衡！双方下一张打出的牌将被无效。");
    }
};
