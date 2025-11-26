
import { CardDefinition, CardSuit } from '../../../types';
import { modifyPlayer } from '../../../services/actions';

export const WANDS_PRIESTESS: CardDefinition = {
    id: 'wands-priestess', name: '权杖·女祭司', suit: CardSuit.WANDS, rank: 202,
    description: "打出：恢复[Atk]点生命值。",
    keywords: [],
    onReveal: (ctx) => {
        const atk = ctx.gameState[ctx.sourcePlayerId === 1 ? 'player1' : 'player2'].atk;
        modifyPlayer(ctx, ctx.sourcePlayerId, p => ({ ...p, hp: p.hp + atk }));
    }
};
