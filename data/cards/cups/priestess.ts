
import { CardDefinition, CardSuit, InstantWindow } from '../../../types';
import { modifyPlayer } from '../../../services/actions';

export const CUPS_PRIESTESS: CardDefinition = {
    id: 'cups-priestess', name: '圣杯·女祭司', suit: CardSuit.CUPS, rank: 102,
    description: "打出：己方下回合不受伤害。\n插入(亮牌前)：己方这回合不再受伤害。",
    keywords: [],
    onReveal: (ctx) => { modifyPlayer(ctx, ctx.sourcePlayerId, p => ({...p, immunityNextTurn: true})); },
    canInstant: (w) => w === InstantWindow.BEFORE_REVEAL,
    onInstant: (ctx) => { modifyPlayer(ctx, ctx.sourcePlayerId, p => ({...p, immunityThisTurn: true})); }
};
