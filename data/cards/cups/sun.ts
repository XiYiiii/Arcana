import { CardDefinition, CardSuit, InstantWindow } from '../../../types';
import { damagePlayer, getOpponentId } from '../../../services/actions';

export const CUPS_SUN: CardDefinition = {
    id: 'cups-sun', name: '圣杯·太阳', suit: CardSuit.CUPS, rank: 119,
    keywords: [],
    canSet: false,
    onReveal: (ctx) => {
        const atk = ctx.gameState[ctx.sourcePlayerId===1?'player1':'player2'].atk;
        damagePlayer(ctx, getOpponentId(ctx.sourcePlayerId), 2*atk);
    },
    canInstant: (w) => w === InstantWindow.BEFORE_SET,
    onInstant: (ctx) => { ctx.log("【太阳】闪耀！(没有效果)"); }
};