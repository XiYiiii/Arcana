
import { CardDefinition, CardSuit, InstantWindow, Keyword } from '../../../types';
import { modifyPlayer, damagePlayer, getOpponentId } from '../../../services/actions';

export const CUPS_HANGEDMAN: CardDefinition = {
    id: 'cups-hangedman', name: '圣杯·倒吊人', suit: CardSuit.CUPS, rank: 112,
    // Description handled by data/descriptions.ts
    keywords: [Keyword.INVALIDATE],
    onReveal: (ctx) => {
        const hp = ctx.gameState[ctx.sourcePlayerId === 1 ? 'player1' : 'player2'].hp;
        const cost = Math.floor(hp / 2);
        ctx.log(`【倒吊人】献祭 ${cost} HP，将在3回合后归还 ${cost*2} HP。`);
        modifyPlayer(ctx, ctx.sourcePlayerId, p => ({ 
            ...p, 
            hp: p.hp - cost, 
            delayedEffects: [...p.delayedEffects, { turnsRemaining: 3, action: 'DRAW', amount: 0, sourceCardName: `RECOVER_HP:${cost*2}` }]
        }));
    },
    canInstant: (w) => w === InstantWindow.AFTER_REVEAL,
    onInstant: (ctx) => {
        const oppId = getOpponentId(ctx.sourcePlayerId);
        const oppCard = ctx.gameState[oppId === 1 ? 'player1' : 'player2'].fieldSlot;
        if (oppCard && (oppCard.name.includes('正义') || oppCard.name.includes('审判'))) {
            modifyPlayer(ctx, oppId, p => ({ ...p, isInvalidated: true }));
            const atk = ctx.gameState[ctx.sourcePlayerId === 1 ? 'player1' : 'player2'].atk;
            damagePlayer(ctx, oppId, atk);
        }
    }
};
