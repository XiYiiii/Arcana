
import { EffectContext, Card, PlayerState } from '../../types';
import { checkPentaclesWheelActivation } from './utils';

export const discardField = (ctx: EffectContext) => {
    ctx.setGameState(prev => {
        if (!prev || !prev.field) return prev;
        
        const card = prev.field.card;
        const ownerId = prev.field.ownerId;
        const key = ownerId === 1 ? 'player1' : 'player2';
        
        ctx.log(`[场地] ${card.name} 被弃置/覆盖。`);
        
        if (card.isTreasure) {
             ctx.log(`[归库] 宝藏场地 [${card.name}] 回到了宝库。`);
             return { ...prev, field: null };
        }

        // Revert Buffs if specific cards
        let p = prev[key];
        if (card.name.includes('圣杯·力量')) {
            ctx.log(`[圣杯·力量] 场地失效，攻击力还原。`);
            p = { ...p, atk: p.atk - 1 };
        }

        return {
            ...prev,
            [key]: { ...p, discardPile: [...p.discardPile, card] },
            field: null
        };
    });
};

export const setField = (ctx: EffectContext, card: Card, activateNow: boolean = false) => {
    // First discard existing field if any
    discardField(ctx);

    ctx.setGameState(prev => {
        if (!prev) return null;
        
        // Apply Buffs for new field
        const key = ctx.sourcePlayerId === 1 ? 'player1' : 'player2';
        let p = prev[key];
        
        if (card.name.includes('圣杯·力量')) {
            ctx.log(`[圣杯·力量] 场地激活！攻击力+1。`);
            p = { ...p, atk: p.atk + 1 };
        }

        ctx.log(`[场地] 设置为: ${card.name}`);

        const intermediateState = {
            ...prev,
            [key]: p,
            field: {
                card,
                ownerId: ctx.sourcePlayerId,
                counter: 0,
                active: activateNow // Use parameter to decide activation
            }
        };
        
        return checkPentaclesWheelActivation(intermediateState);
    });
};
