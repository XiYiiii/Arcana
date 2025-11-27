
import { EffectContext } from '../../types';
import { checkPentaclesWheelActivation } from './utils';

export const checkGameOver = (ctx: EffectContext) => {
    ctx.setGameState(prev => {
        if(!prev) return null;

        // Pentacles Wheel Field Override
        let p1Win = prev.player2.hp <= 0;
        let p2Win = prev.player1.hp <= 0;

        // Ensure active state is correct
        const intermediate = checkPentaclesWheelActivation(prev);

        if (intermediate.field && intermediate.field.active && intermediate.field.card.name.includes('星币·命运之轮')) {
            const owner = intermediate.field.ownerId;
            if (owner === 1) {
                // P1 Victory if P1 HP <= 0 (Self HP <= 0)
                if (intermediate.player1.hp <= 0) p1Win = true;
            } else {
                // P2 Victory if P2 HP <= 0 (Self HP <= 0)
                if (intermediate.player2.hp <= 0) p2Win = true;
            }
        }

        if(p1Win || p2Win) {
            let msg = p1Win && p2Win ? "双方平局！" : p1Win ? "玩家 1 获胜！" : "玩家 2 获胜！";
            return { ...intermediate, phase: 'GAME_OVER' as any, logs: [msg, ...intermediate.logs] };
        }
        return intermediate;
    });
};
