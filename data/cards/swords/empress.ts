import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, addMarkToCard, getOpponentId } from '../../../services/actions';

export const SWORDS_EMPRESS: CardDefinition = {
    id: 'swords-empress', name: '宝剑·女皇', suit: CardSuit.SWORDS, rank: 303,
    keywords: [Keyword.IMPRINT],
    onReveal: (ctx) => {
        modifyPlayer(ctx, ctx.sourcePlayerId, p => ({
            ...p,
            hand: p.hand.map(c => c.suit === CardSuit.SWORDS ? addMarkToCard(c, 'mark-swords-empress') : c)
        }));
    }
};