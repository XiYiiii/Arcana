

import { CardDefinition, CardSuit } from '../../../types';
import { modifyPlayer, damagePlayer, drawCards } from '../../../services/actions';

export const CUPS_JUSTICE: CardDefinition = {
    id: 'cups-justice', name: '圣杯·正义', suit: CardSuit.CUPS, rank: 111,
    description: "抽到：丢弃双方所有手牌，每丢弃一张扣除一点生命。\n打出：双方同时抽取牌，直到双方手牌达到三张，每抽一张扣除一点生命。",
    keywords: [],
    onDraw: (ctx) => {
        const handle = (pid: number) => {
            const p = pid === 1 ? ctx.gameState.player1 : ctx.gameState.player2;
            const count = p.hand.length;
            if (count > 0) {
                damagePlayer(ctx, pid, count);
                modifyPlayer(ctx, pid, x => ({...x, hand: [], discardPile: [...x.discardPile, ...x.hand]}));
            }
        };
        handle(1); handle(2);
    },
    onReveal: (ctx) => {
        const handleRefill = (pid: number) => {
            const p = pid === 1 ? ctx.gameState.player1 : ctx.gameState.player2;
            const toDraw = 3 - p.hand.length;
            if (toDraw > 0) {
                damagePlayer(ctx, pid, toDraw);
                drawCards(ctx, pid, toDraw);
            }
        };
        // Need to access updated state for simultaneous draw logic, 
        // but simple sequential execution works in this framework's state queue
        handleRefill(1);
        handleRefill(2);
    }
};