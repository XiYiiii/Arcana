import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { drawCards, addMarkToCard, getOpponentId, discardCards } from '../../../services/actions';

export const CUPS_MAGICIAN: CardDefinition = {
    id: 'cups-magician', name: '圣杯·魔术师', suit: CardSuit.CUPS, rank: 101,
    keywords: [Keyword.IMPRINT],
    onDraw: (ctx) => {
        drawCards(ctx, ctx.sourcePlayerId, 1);
        setTimeout(() => {
            ctx.setGameState(prev => {
                if(!prev) return null;
                const myKey = ctx.sourcePlayerId === 1 ? 'player1' : 'player2';
                const hand = prev[myKey].hand;
                const newCard = hand[hand.length - 1]; 
                if(!newCard) return prev;

                const markedNewCard = addMarkToCard(newCard, 'mark-cups-magician');
                const newHand = [...hand.slice(0, hand.length-1), markedNewCard];

                // Closure to handle resolution with the correct suit
                const resolveGuess = (c: any, targetId: string, guessedSuit: CardSuit) => {
                     const isCorrect = markedNewCard.suit === guessedSuit; 
                     c.setGameState((curr: any) => {
                         if(!curr) return null;
                         if (isCorrect) {
                             c.log(`对手猜对了 (${guessedSuit})！魔术师的戏法被识破，牌被弃置。`);
                             const ctxDisc = { ...c, card: { instanceId: targetId } };
                             discardCards(ctxDisc, c.sourcePlayerId, [targetId]);
                         } else {
                             c.log(`对手猜错了 (选择了 ${guessedSuit})！你保留了这张牌。`);
                         }
                         return { ...curr, interaction: null };
                     });
                };

                return {
                    ...prev,
                    [myKey]: { ...prev[myKey], hand: newHand },
                    interaction: {
                        id: `magician-guess-${Date.now()}`,
                        playerId: getOpponentId(ctx.sourcePlayerId),
                        title: "魔术师的戏法",
                        description: "对手抽了一张牌。请猜测：这张新牌的花色是什么？",
                        options: [
                            { label: "🏆 圣杯", action: () => resolveGuess(ctx, markedNewCard.instanceId, CardSuit.CUPS) },
                            { label: "⚔️ 宝剑", action: () => resolveGuess(ctx, markedNewCard.instanceId, CardSuit.SWORDS) },
                            { label: "🪄 权杖", action: () => resolveGuess(ctx, markedNewCard.instanceId, CardSuit.WANDS) },
                            { label: "🪙 星币", action: () => resolveGuess(ctx, markedNewCard.instanceId, CardSuit.PENTACLES) }
                        ]
                    }
                };
            });
        }, 200);
    }
};