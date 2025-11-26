

import { CardDefinition, CardSuit } from '../../../types';
import { modifyPlayer } from '../../../services/actions';

export const SWORDS_STRENGTH: CardDefinition = {
    id: 'swords-strength', name: '宝剑·力量', suit: CardSuit.SWORDS, rank: 308,
    description: "打出：下一回合Atk+2。\n弃置：下一回合Atk-1。",
    keywords: [],
    onReveal: (ctx) => {
        modifyPlayer(ctx, ctx.sourcePlayerId, p => ({
            ...p,
            delayedEffects: [...p.delayedEffects, { turnsRemaining: 1, action: 'ATK_CHANGE', amount: 2, sourceCardName: '宝剑·力量' }]
        }));
    },
    onDiscard: (ctx) => {
        modifyPlayer(ctx, ctx.sourcePlayerId, p => ({
            ...p,
            delayedEffects: [...p.delayedEffects, { turnsRemaining: 1, action: 'ATK_CHANGE', amount: -1, sourceCardName: '宝剑·力量(弃置)' }]
        }));
    }
};