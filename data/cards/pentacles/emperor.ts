
import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, discardCards, seizeCard, getOpponentId } from '../../../services/actions';

export const PENTACLES_EMPEROR: CardDefinition = {
    id: 'pentacles-emperor', name: '星币·皇帝', suit: CardSuit.PENTACLES, rank: 404,
    description: "打出：取一个n，扣除己方4*n点Hp，弃置己方n张牌，然后夺取对方n张牌。\n被动：当此牌被盲夺或夺取时，这张牌被弃置。",
    keywords: [Keyword.SEIZE],
    onReveal: (ctx) => {
        const hp = ctx.gameState[ctx.sourcePlayerId === 1 ? 'player1' : 'player2'].hp;
        const maxN = Math.floor((hp - 1) / 4);

        if (maxN < 1) {
            ctx.log("生命值不足以支付最小代价 (4HP)。");
            return;
        }

        ctx.setGameState(prev => ({
            ...prev!,
            interaction: {
                id: `pentacles-emperor-cost-${Date.now()}`,
                playerId: ctx.sourcePlayerId,
                title: "星币·皇帝",
                description: `选择数值 n (消耗 4*n HP, 弃 n 张, 夺 n 张):`,
                inputType: 'NUMBER_INPUT',
                min: 1, max: Math.min(3, maxN), // Cap at 3 for sanity
                onConfirm: (n: number) => {
                    const cost = n * 4;
                    ctx.log(`【星币·皇帝】支付 ${cost} HP，执行 n=${n} 的权能。`);
                    
                    modifyPlayer(ctx, ctx.sourcePlayerId, p => ({ ...p, hp: p.hp - cost }));
                    
                    // Discard n cards
                    ctx.setGameState(s => {
                        if(!s) return null;
                        const p = s[ctx.sourcePlayerId===1?'player1':'player2'];
                        const toDiscard = p.hand.slice(0, n).map(c => c.instanceId);
                        // We use the helper, but need to pass context. 
                        // Since helper is async state update, we can call it.
                        // But we are inside setGameState. We need to exit it first.
                        return { ...s, interaction: null }; // Close modal
                    });

                    // Execute effects in sequence
                    setTimeout(() => {
                         // Logic for discarding n random/first cards
                         const p = ctx.gameState[ctx.sourcePlayerId===1?'player1':'player2'];
                         const toDiscard = p.hand.filter(c=>!c.isTreasure).slice(0, n).map(c=>c.instanceId);
                         discardCards(ctx, ctx.sourcePlayerId, toDiscard);
                         
                         // Seize n cards interaction
                         startSeizeLoop(ctx, n, n);
                    }, 100);
                }
            }
        }));
    }
};

const startSeizeLoop = (ctx: any, total: number, remaining: number) => {
    if (remaining <= 0) return;
    
    const oppId = getOpponentId(ctx.sourcePlayerId);
    const oppKey = oppId === 1 ? 'player1' : 'player2';

    ctx.setGameState((prev: any) => {
        if(!prev) return null;
        const oppHand = prev[oppKey].hand;
        if (oppHand.length === 0) {
            ctx.log("对手无牌可夺。");
            return prev;
        }

        return {
            ...prev,
            interaction: {
                id: `pentacles-emperor-seize-${Date.now()}-${remaining}`,
                playerId: ctx.sourcePlayerId,
                title: `星币·皇帝 (${total - remaining + 1}/${total})`,
                description: "夺取一张牌:",
                inputType: 'CARD_SELECT',
                cardsToSelect: oppHand,
                onCardSelect: (c: any) => {
                    seizeCard(ctx, c.instanceId);
                    setTimeout(() => {
                        startSeizeLoop(ctx, total, remaining - 1);
                    }, 200);
                    ctx.setGameState((s:any) => s ? ({...s, interaction: null}) : null);
                }
            }
        };
    });
};
