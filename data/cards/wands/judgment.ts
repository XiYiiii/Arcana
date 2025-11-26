
import { CardDefinition, CardSuit } from '../../../types';
import { modifyPlayer, getOpponentId } from '../../../services/actions';

export const WANDS_JUDGMENT: CardDefinition = {
    id: 'wands-judgment', name: '权杖·审判', suit: CardSuit.WANDS, rank: 220,
    description: "打出：弃置对手手牌中的“倒吊人”、“恶魔”、“高塔”（若有）。\n弃置：弃置对手手牌中的“正义”（若有）。",
    keywords: [],
    onReveal: (ctx) => {
        const oppId = getOpponentId(ctx.sourcePlayerId);
        modifyPlayer(ctx, oppId, p => {
            const targets = p.hand.filter(c => ['倒吊人','恶魔','高塔'].some(n => c.name.includes(n)));
            if(targets.length === 0) return p;
            const newHand = p.hand.filter(c => !targets.includes(c));
            return { ...p, hand: newHand, discardPile: [...p.discardPile, ...targets] };
        });
    },
    onDiscard: (ctx) => {
        const oppId = getOpponentId(ctx.sourcePlayerId);
        modifyPlayer(ctx, oppId, p => {
            const targets = p.hand.filter(c => c.name.includes('正义'));
            return { ...p, hand: p.hand.filter(c => !targets.includes(c)), discardPile: [...p.discardPile, ...targets] };
        });
    }
};
