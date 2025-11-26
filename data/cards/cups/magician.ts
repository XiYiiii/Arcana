
import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { drawCards, addMarkToCard, getOpponentId, discardCards } from '../../../services/actions';

export const CUPS_MAGICIAN: CardDefinition = {
    id: 'cups-magician', name: '圣杯·魔术师', suit: CardSuit.CUPS, rank: 101,
    description: "抽到：抽1张牌并标记为“圣杯·魔术师”。将其与此牌打混令对手猜测。若猜错，己方保留该牌；否则己方弃置该牌。\n印记(圣杯·魔术师)：这张牌的特效触发两次。",
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

                return {
                    ...prev,
                    [myKey]: { ...prev[myKey], hand: newHand },
                    interaction: {
                        id: `magician-guess-${Date.now()}`,
                        playerId: getOpponentId(ctx.sourcePlayerId),
                        title: "魔术师的戏法",
                        description: "对手抽了一张牌。请猜测：哪一张是新抽到的标记牌？(50% 概率)",
                        options: [
                            { label: "左边那张", action: () => resolveGuess(ctx, markedNewCard.instanceId) },
                            { label: "右边那张", action: () => resolveGuess(ctx, markedNewCard.instanceId) }
                        ]
                    }
                };
            });
        }, 200);

        const resolveGuess = (c: any, targetId: string) => {
             const isCorrect = Math.random() > 0.5; 
             c.setGameState((prev: any) => {
                 if(!prev) return null;
                 if (isCorrect) {
                     c.log("对手猜对了！魔术师的戏法被识破，牌被弃置。");
                     const ctxDisc = { ...c, card: { instanceId: targetId } };
                     discardCards(ctxDisc, c.sourcePlayerId, [targetId]);
                 } else {
                     c.log("对手猜错了！你保留了这张牌。");
                 }
                 return { ...prev, interaction: null };
             });
        };
    }
};
