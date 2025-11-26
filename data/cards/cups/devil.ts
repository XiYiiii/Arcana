
import { CardDefinition, CardSuit } from '../../../types';
import { damagePlayer, drawCards } from '../../../services/actions';

export const CUPS_DEVIL: CardDefinition = {
    id: 'cups-devil', name: '圣杯·恶魔', suit: CardSuit.CUPS, rank: 115,
    description: "打出：抽取0~5张牌。每抽一张扣除2生命。",
    keywords: [],
    onReveal: (ctx) => {
        ctx.setGameState(prev => ({
            ...prev!,
            interaction: {
                id: `devil-draw-${Date.now()}`,
                playerId: ctx.sourcePlayerId,
                title: "圣杯·恶魔",
                description: "选择抽牌数量 (每张 -2HP):",
                inputType: 'NUMBER_INPUT',
                min: 0, max: 5,
                onConfirm: (n) => {
                    damagePlayer(ctx, ctx.sourcePlayerId, n*2);
                    drawCards(ctx, ctx.sourcePlayerId, n);
                    ctx.setGameState(s=>s?({...s,interaction:null}):null);
                }
            }
        }));
    }
};
