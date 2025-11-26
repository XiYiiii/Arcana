
import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { transformCard, getOpponentId } from '../../../services/actions';

export const PENTACLES_HERMIT: CardDefinition = {
    id: 'pentacles-hermit', name: '星币·隐者', suit: CardSuit.PENTACLES, rank: 409,
    description: "抽到：占卜己方两张牌。\n打出：占卜己方四张牌，挑选其中任意张，将其变化，抽牌堆顺序不变。\n弃置：占卜对方两张牌。",
    keywords: [Keyword.SCRY, Keyword.TRANSFORM],
    onDraw: (ctx) => {
        const deck = ctx.gameState[ctx.sourcePlayerId === 1 ? 'player1' : 'player2'].deck;
        const top2 = deck.slice(0, 2).map(c=>c.name).join(', ');
        ctx.log(`【星币·隐者】占卜己方：${top2 || '无牌'}`);
    },
    onReveal: (ctx) => {
        ctx.setGameState(prev => {
            if(!prev) return null;
            const key = ctx.sourcePlayerId === 1 ? 'player1' : 'player2';
            const deck = prev[key].deck;
            if(deck.length === 0) return prev;
            
            const toScry = deck.slice(0, 4);

            return {
                ...prev,
                interaction: {
                    id: `pentacles-hermit-transform-${Date.now()}`,
                    playerId: ctx.sourcePlayerId,
                    title: "星币·隐者",
                    description: "选择任意张牌进行变化:",
                    inputType: 'CARD_SELECT',
                    cardsToSelect: toScry,
                    options: [{label:"完成", action:()=>ctx.setGameState(s=>s?({...s,interaction:null}):null)}],
                    onCardSelect: (c) => {
                        // Transform card IN DECK
                        // transformCard helper handles deck updates if implemented correctly
                        transformCard(ctx, ctx.sourcePlayerId, c.instanceId);
                    }
                }
            };
        });
    },
    onDiscard: (ctx) => {
        const oppId = getOpponentId(ctx.sourcePlayerId);
        const deck = ctx.gameState[oppId === 1 ? 'player1' : 'player2'].deck;
        const top2 = deck.slice(0, 2).map(c=>c.name).join(', ');
        ctx.log(`【星币·隐者】占卜对方：${top2 || '无牌'}`);
    }
};
