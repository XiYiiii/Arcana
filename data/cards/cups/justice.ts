
import { CardDefinition, CardSuit } from '../../../types';
import { modifyPlayer, damagePlayer } from '../../../services/actions';

export const CUPS_JUSTICE: CardDefinition = {
    id: 'cups-justice', name: '圣杯·正义', suit: CardSuit.CUPS, rank: 111,
    description: "抽到：弃置双方所有手牌。每丢弃一张，扣除持有者1点生命。",
    keywords: [],
    onDraw: (ctx) => {
        const handle = (pid: number) => {
            const p = pid === 1 ? ctx.gameState.player1 : ctx.gameState.player2;
            const count = p.hand.length;
            damagePlayer(ctx, pid, count);
            modifyPlayer(ctx, pid, x => ({...x, hand: [], discardPile: [...x.discardPile, ...x.hand]}));
        };
        handle(1); handle(2);
    }
};
