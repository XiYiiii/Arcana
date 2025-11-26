import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, discardCards } from '../../../services/actions';
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
                    { label: "💎 宝剑", action: () => giveTreasure(ctx, TREASURE_SWORDS) },
                    { label: "💎 圣杯", action: () => giveTreasure(ctx, TREASURE_CUPS) },
                    { label: "💎 权杖", action: () => giveTreasure(ctx, TREASURE_WANDS) }
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

const giveTreasure = (ctx: any, def: CardDefinition) => {
    const t = { ...def, instanceId: `treasure-${Date.now()}`, marks: [], description: def.description || "" };
    modifyPlayer(ctx, ctx.sourcePlayerId, p => ({ ...p, hand: [...p.hand, t] }));
    ctx.setGameState((s:any) => s ? ({...s, interaction: null}) : null);
};