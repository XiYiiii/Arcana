


import { CardDefinition, CardSuit, Keyword, InstantWindow } from '../../../types';
import { lockRandomCard } from '../../../services/actions';

export const SWORDS_JUDGMENT: CardDefinition = {
    id: 'swords-judgment', name: '宝剑·审判', suit: CardSuit.SWORDS, rank: 320,
    description: "抽到：随机锁定双方各一张牌。\n打出：随机锁定双方各一张牌。\n插入(任意)：随机锁定双方各一张牌。\n弃置：随机锁定双方各一张牌。",
    keywords: [Keyword.LOCK],
    onDraw: (ctx) => {
        lockRandomCard(ctx, 1, 1);
        lockRandomCard(ctx, 2, 1);
    },
    onReveal: (ctx) => {
        lockRandomCard(ctx, 1, 1);
        lockRandomCard(ctx, 2, 1);
    },
    canInstant: () => true,
    onInstant: (ctx) => {
        lockRandomCard(ctx, 1, 1);
        lockRandomCard(ctx, 2, 1);
    },
    onDiscard: (ctx) => {
        lockRandomCard(ctx, 1, 1);
        lockRandomCard(ctx, 2, 1);
    }
};