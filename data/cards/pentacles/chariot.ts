
import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { clash, modifyPlayer, shufflePlayerDeck } from '../../../services/actions';

export const PENTACLES_CHARIOT: CardDefinition = {
    id: 'pentacles-chariot', name: '星币·战车', suit: CardSuit.PENTACLES, rank: 407,
    description: "打出：从双方抽牌堆顶端抽取一张牌并进行拼点，这两张牌都加入各自手牌。若双方点数相同则均被锁定，否则点数者所抽的牌被锁定。\n弃置：打乱双方抽牌堆。",
    keywords: [Keyword.CLASH, Keyword.LOCK, Keyword.SHUFFLE],
    onReveal: (ctx) => {
        clash(ctx, (c, result, myCard, oppCard) => {
             // Both get cards to hand always
             const myId = c.sourcePlayerId;
             const oppId = c.sourcePlayerId === 1 ? 2 : 1;
             
             // Logic: Equal -> Both Locked. Diff -> Winner's card Locked.
             // Wait, "Winner's card locked"? "点数者所抽的牌被锁定" -> "The card drawn by the winner is locked".
             // The prompt says: "Otherwise the card drawn by the winner is locked".
             // If I Win, my card is locked? Yes.
             
             const lockMine = result === 'TIE' || result === 'WIN';
             const lockOpp = result === 'TIE' || result === 'LOSE'; // Opp wins if I lose
             
             modifyPlayer(c, myId, p => ({ ...p, hand: [...p.hand, { ...myCard, isLocked: lockMine }] }));
             modifyPlayer(c, oppId, p => ({ ...p, hand: [...p.hand, { ...oppCard, isLocked: lockOpp }] }));
        });
    },
    onDiscard: (ctx) => {
        shufflePlayerDeck(ctx, 1);
        shufflePlayerDeck(ctx, 2);
    }
};
