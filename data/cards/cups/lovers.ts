import { CardDefinition, CardSuit } from '../../../types';
import { modifyPlayer, getOpponentId } from '../../../services/actions';

export const CUPS_LOVERS: CardDefinition = {
    id: 'cups-lovers', name: '圣杯·恋人', suit: CardSuit.CUPS, rank: 106,
    description: "抽到：随机与对方的一张手牌交换（不含宝藏牌）。",
    keywords: [],
    onDraw: (ctx) => {
        const oppId = getOpponentId(ctx.sourcePlayerId);
        ctx.setGameState(prev => {
            if (!prev) return null;
            
            const oppKey = oppId === 1 ? 'player1' : 'player2';
            const myKey = ctx.sourcePlayerId === 1 ? 'player1' : 'player2';
            
            const oppHand = prev[oppKey].hand.filter(c => !c.isTreasure);
            if (oppHand.length === 0) {
                ctx.log("【恋人】对手没有可交换的手牌！");
                return prev;
            }

            const randomIndex = Math.floor(Math.random() * oppHand.length);
            const cardToSwap = oppHand[randomIndex];

            ctx.log(`【恋人】与对手交换了 [${cardToSwap.name}]！`);

            const newOppHand = prev[oppKey].hand.map(c => c.instanceId === cardToSwap.instanceId ? ctx.card : c);
            const newMyHand = prev[myKey].hand.map(c => c.instanceId === ctx.card.instanceId ? cardToSwap : c);

            return {
                ...prev,
                [oppKey]: { ...prev[oppKey], hand: newOppHand },
                [myKey]: { ...prev[myKey], hand: newMyHand }
            };
        });
    }
};