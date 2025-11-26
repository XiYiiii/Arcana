

import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { clash, modifyPlayer, shufflePlayerDeck } from '../../../services/actions';

export const PENTACLES_CHARIOT: CardDefinition = {
    id: 'pentacles-chariot', name: '星币·战车', suit: CardSuit.PENTACLES, rank: 407,
    keywords: [Keyword.CLASH, Keyword.LOCK, Keyword.SHUFFLE],
    onReveal: (ctx) => {
        clash(ctx, (c, result, myCard, oppCard) => {
             // Both get cards to hand always
             const myId = c.sourcePlayerId;
             const oppId = c.sourcePlayerId === 1 ? 2 : 1;
             
             // Logic: 
             // Tie (Equal) -> Both Locked. 
             // Else (Different) -> Smaller point value card (Loser's card) is Locked.
             
             // If I WIN, I have larger points. So my card is NOT locked.
             // If I LOSE, I have smaller points. So my card IS locked.
             // If I WIN, Opponent LOSES. Opponent card IS locked.
             
             const lockMine = result !== 'WIN'; // True if LOSE or TIE
             const lockOpp = result !== 'LOSE'; // True if WIN (for me, so Opp Lost) or TIE
             
             modifyPlayer(c, myId, p => ({ ...p, hand: [...p.hand, { ...myCard, isLocked: lockMine }] }));
             modifyPlayer(c, oppId, p => ({ ...p, hand: [...p.hand, { ...oppCard, isLocked: lockOpp }] }));
        });
    },
    onDiscard: (ctx) => {
        shufflePlayerDeck(ctx, 1);
        shufflePlayerDeck(ctx, 2);
    }
};