
import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { drawCards, damagePlayer, getOpponentId, modifyPlayer, setField, addMarkToCard } from '../../../services/actions';
import { CARD_DEFINITIONS } from '../../cards';

export const PENTACLES_HIEROPHANT: CardDefinition = {
    id: 'pentacles-hierophant', name: '星币·教皇', suit: CardSuit.PENTACLES, rank: 405,
    description: "抽到：若当前有场地，场地的所有人对另一方造成其[Atk]点伤害；若当前无场地，则随机从己方抽牌堆中抽一张带有“场地”关键词的牌，并将其对应的场地置入。\n打出：若当前有场地，将己方随机一张手牌标记为“星币·教皇”；若当前没有场地，抽两张牌。\n(标记“星币·教皇”)打出这张牌时，抽一张牌。",
    keywords: [Keyword.IMPRINT, Keyword.FIELD],
    onDraw: (ctx) => {
        if (ctx.gameState.field) {
            const owner = ctx.gameState.field.ownerId;
            const opp = getOpponentId(owner);
            const atk = ctx.gameState[owner===1?'player1':'player2'].atk;
            damagePlayer(ctx, opp, atk);
        } else {
            // Fetch random field card
            modifyPlayer(ctx, ctx.sourcePlayerId, p => {
                const fieldCards = p.deck.filter(c => c.keywords?.includes(Keyword.FIELD));
                if (fieldCards.length === 0) return p;
                
                const rand = fieldCards[Math.floor(Math.random() * fieldCards.length)];
                ctx.log(`【星币·教皇】布道！设置了 [${rand.name}]。`);
                
                // Set field (Need to execute action outside modifyPlayer ideally, but setField works)
                // We need to remove from deck first
                const newDeck = p.deck.filter(c => c.instanceId !== rand.instanceId);
                
                // Hack: We can't call setField inside modifyPlayer easily as it also modifies state.
                // We'll queue it via timeout or just do it here since we are in an effect context but separate from the modifier.
                setTimeout(() => setField(ctx, rand), 50);
                
                return { ...p, deck: newDeck };
            });
        }
    },
    onReveal: (ctx) => {
        if (ctx.gameState.field) {
            modifyPlayer(ctx, ctx.sourcePlayerId, p => {
                if (p.hand.length === 0) return p;
                const r = Math.floor(Math.random() * p.hand.length);
                return { ...p, hand: p.hand.map((c, i) => i === r ? addMarkToCard(c, 'mark-pentacles-hierophant') : c) };
            });
        } else {
            drawCards(ctx, ctx.sourcePlayerId, 2);
        }
    }
};
