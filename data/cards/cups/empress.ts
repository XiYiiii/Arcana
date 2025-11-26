
import { CardDefinition, CardSuit, InstantWindow } from '../../../types';
import { modifyPlayer, drawCards, getOpponentId } from '../../../services/actions';

export const CUPS_EMPRESS: CardDefinition = {
    id: 'cups-empress', name: '圣杯·女皇', suit: CardSuit.CUPS, rank: 103,
    description: "打出：己方下一张触发特效的牌触发两次。\n插入(亮牌前)：己方抽2张牌。对方下一张触发特效的牌触发两次。",
    keywords: [],
    onReveal: (ctx) => { modifyPlayer(ctx, ctx.sourcePlayerId, p => ({...p, effectDoubleNext: true})); },
    canInstant: (w) => w === InstantWindow.BEFORE_REVEAL,
    onInstant: (ctx) => { 
        modifyPlayer(ctx, getOpponentId(ctx.sourcePlayerId), p => ({...p, effectDoubleNext: true})); 
        drawCards(ctx, ctx.sourcePlayerId, 2);
    }
};
