import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { damagePlayer, drawCards, addMarkToCard, getOpponentId } from '../../../services/actions';

export const SWORDS_MAGICIAN: CardDefinition = {
    id: 'swords-magician', name: '宝剑·魔术师', suit: CardSuit.SWORDS, rank: 301,
    keywords: [Keyword.IMPRINT],
    onReveal: (ctx) => {
        drawCards(ctx, ctx.sourcePlayerId, 1);
        const oppId = getOpponentId(ctx.sourcePlayerId);
        
        setTimeout(() => {
            ctx.setGameState(prev => {
                if (!prev) return null;
                const p = prev[ctx.sourcePlayerId === 1 ? 'player1' : 'player2'];
                if (p.hand.length === 0) return prev;
                const lastCard = p.hand[p.hand.length - 1];
                
                // Mark the card
                const newHand = p.hand.map(c => c.instanceId === lastCard.instanceId ? addMarkToCard(c, 'mark-swords-magician') : c);
                
                return {
                    ...prev,
                    [ctx.sourcePlayerId === 1 ? 'player1' : 'player2']: { ...p, hand: newHand },
                    interaction: {
                        id: `magician-guess-suit-${Date.now()}`,
                        playerId: oppId,
                        title: "宝剑·魔术师",
                        description: "对手抽了一张牌。请猜测该牌的花色：",
                        options: [
                            { label: "🏆 圣杯", action: () => resolve(ctx, lastCard, CardSuit.CUPS) },
                            { label: "⚔️ 宝剑", action: () => resolve(ctx, lastCard, CardSuit.SWORDS) },
                            { label: "🪄 权杖", action: () => resolve(ctx, lastCard, CardSuit.WANDS) },
                            { label: "🪙 星币", action: () => resolve(ctx, lastCard, CardSuit.PENTACLES) }
                        ]
                    }
                };
            });
        }, 300);

        const resolve = (c: any, targetCard: any, guessedSuit: CardSuit) => {
            const correct = targetCard.suit === guessedSuit;
            c.setGameState((prev: any) => {
                if(!prev) return null;
                const atk = prev[c.sourcePlayerId === 1 ? 'player1' : 'player2'].atk;
                if (correct) {
                    c.log("对手猜对了！");
                    damagePlayer(c, c.sourcePlayerId, 2 * atk);
                } else {
                    c.log(`对手猜错了 (实际是 ${targetCard.suit})！`);
                    damagePlayer(c, getOpponentId(c.sourcePlayerId), atk);
                }
                return { ...prev, interaction: null };
            });
        };
    }
};