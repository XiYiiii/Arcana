import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { addQuest } from '../../../services/actions';

export const SWORDS_SUN: CardDefinition = {
    id: 'swords-sun', name: '宝剑·太阳', suit: CardSuit.SWORDS, rank: 319,
    keywords: [Keyword.QUEST],
    onReveal: (ctx) => {
        addQuest(ctx, ctx.sourcePlayerId, {
            id: 'quest-swords-sun',
            name: '宝剑·太阳',
            description: '打出 太阳',
            progress: 0,
            target: 1
        });
    }
};