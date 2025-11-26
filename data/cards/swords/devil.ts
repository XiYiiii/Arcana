import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, addMarkToCard, discardField, damagePlayer, getOpponentId } from '../../../services/actions';

export const SWORDS_DEVIL: CardDefinition = {
    id: 'swords-devil', name: '宝剑·恶魔', suit: CardSuit.SWORDS, rank: 315,
    keywords: [Keyword.IMPRINT],
    onReveal: (ctx) => {
        const markAll = (pid: number) => {
            modifyPlayer(ctx, pid, p => ({
                ...p,
                hand: p.hand.map(c => addMarkToCard(c, 'mark-swords-devil'))
            }));
        };
        markAll(1);
        markAll(2);
        
        // Check self mark effect logic (Since this card is "Played", if it has mark, do dmg)
        if (ctx.card.marks.includes('mark-swords-devil')) {
            damagePlayer(ctx, getOpponentId(ctx.sourcePlayerId), 1);
        }
    },
    onDiscard: (ctx) => {
        if (ctx.gameState.field) {
            const ownerId = ctx.gameState.field.ownerId;
            const atk = ctx.gameState[ownerId === 1 ? 'player1' : 'player2'].atk;
            discardField(ctx);
            damagePlayer(ctx, ownerId, atk);
        }
    }
};