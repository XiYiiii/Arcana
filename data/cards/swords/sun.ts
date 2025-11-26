


import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { addQuest } from '../../../services/actions';

export const SWORDS_SUN: CardDefinition = {
    id: 'swords-sun', name: '宝剑·太阳', suit: CardSuit.SWORDS, rank: 319,
    description: "打出：己方获得任务“宝剑·太阳”。\n(任务“宝剑·太阳”)打出一张“太阳”后完成任务。任务完成后选择：对对方造成[2*Atk]点伤害，或再获得一次“宝剑·太阳”，并将造成的伤害翻倍。",
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