import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, giveCardReward } from '../../../services/actions';
import { TREASURE_CUPS } from '../cups/treasure';
import { TREASURE_WANDS } from '../wands/treasure';
import { TREASURE_SWORDS } from './treasure';

export const SWORDS_EMPEROR: CardDefinition = {
    id: 'swords-emperor', name: '宝剑·皇帝', suit: CardSuit.SWORDS, rank: 304,
    keywords: [Keyword.TREASURE],
    onReveal: (ctx) => {
        const hp = ctx.gameState[ctx.sourcePlayerId === 1 ? 'player1' : 'player2'].hp;
        const cost = Math.ceil(hp / 2);
        modifyPlayer(ctx, ctx.sourcePlayerId, p => ({ ...p, hp: p.hp - cost }));
        
        ctx.setGameState(prev => ({
            ...prev!,
            interaction: {
                id: `emperor-treasure-pick-${Date.now()}`,
                playerId: ctx.sourcePlayerId,
                title: "宝剑·皇帝",
                description: "支付了代价。请选择一件宝藏：",
                options: [
                    { label: "💎 宝剑", action: () => giveCardReward(ctx, ctx.sourcePlayerId, TREASURE_SWORDS.id, true) },
                    { label: "💎 圣杯", action: () => giveCardReward(ctx, ctx.sourcePlayerId, TREASURE_CUPS.id, true) },
                    { label: "💎 权杖", action: () => giveCardReward(ctx, ctx.sourcePlayerId, TREASURE_WANDS.id, true) }
                ]
            }
        }));
    },
    onDiscard: (ctx) => {
        const atk = ctx.gameState[ctx.sourcePlayerId === 1 ? 'player1' : 'player2'].atk;
        modifyPlayer(ctx, ctx.sourcePlayerId, p => ({ ...p, hp: p.hp + 2 * atk }));
        // Discard Hand (excluding this card if it's already in discard, but here we discard hand)
        modifyPlayer(ctx, ctx.sourcePlayerId, p => {
             const hand = p.hand;
             return { ...p, hand: [], discardPile: [...p.discardPile, ...hand] };
        });
    }
};