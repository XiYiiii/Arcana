
import { CardDefinition, CardSuit, InstantWindow, Keyword } from '../../../types';
import { modifyPlayer, getOpponentId, addMarkToCard } from '../../../services/actions';

export const WANDS_HERMIT: CardDefinition = {
    id: 'wands-hermit', name: '权杖·隐者', suit: CardSuit.WANDS, rank: 209,
    description: "打出：占卜对方的一张牌。\n插入(任意)：无效对方抽牌堆顶的那一张牌。",
    keywords: [Keyword.SCRY, Keyword.INVALIDATE],
    onReveal: (ctx) => {
        const oppId = getOpponentId(ctx.sourcePlayerId);
        ctx.log("【隐者】正在窥视对手的未来...");
        const oppDeck = ctx.gameState[oppId === 1 ? 'player1' : 'player2'].deck;
        if(oppDeck.length > 0) {
            ctx.log(`【隐者】看到了对手堆顶是: [${oppDeck[0].name}]`);
        }
    },
    canInstant: (w) => w !== InstantWindow.NONE,
    onInstant: (ctx) => {
        const oppId = getOpponentId(ctx.sourcePlayerId);
        modifyPlayer(ctx, oppId, p => p.deck.length > 0 ? { ...p, deck: [addMarkToCard(p.deck[0], 'mark-invalidated'), ...p.deck.slice(1)] } : p);
        ctx.log("【隐者】封印了对手的下一张牌！");
    }
};
