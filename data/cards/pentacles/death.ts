import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, discardCards, returnCard, destroyCard } from '../../../services/actions';

export const PENTACLES_DEATH: CardDefinition = {
    id: 'pentacles-death', name: '星币·死神', suit: CardSuit.PENTACLES, rank: 413,
    keywords: [Keyword.RETURN, Keyword.DESTROY],
    onReveal: (ctx) => {
        ctx.setGameState(prev => ({
            ...prev!,
            interaction: {
                id: `pentacles-death-n-${Date.now()}`,
                playerId: ctx.sourcePlayerId,
                title: "星币·死神",
                description: "选择数值 n (弃 n 回 n):",
                inputType: 'NUMBER_INPUT',
                min: 1, max: 3,
                onConfirm: (n: number) => {
                    ctx.setGameState(s => {
                        if(!s) return null;
                        return {
                            ...s,
                            interaction: {
                                id: `pentacles-death-discard-${Date.now()}`,
                                playerId: ctx.sourcePlayerId,
                                title: `星币·死神 - 弃置 ${n} 张`,
                                description: "选择手牌弃置:",
                                inputType: 'CARD_SELECT',
                                cardsToSelect: s[ctx.sourcePlayerId===1?'player1':'player2'].hand,
                                onCardSelect: (c) => {
                                    discardCards(ctx, ctx.sourcePlayerId, [c.instanceId]);
                                    // Simplified: Select 1 to trigger sequence? 
                                    // To discard multiple, we need loop or multi-select. 
                                    // For simplicity, let's just do 1-for-1 n times or just n=1 logic scaled?
                                    // The prompt implies "Discard n, Return n".
                                    // Let's implement recursive discard then recursive return.
                                    if(n > 1) {
                                        // A bit complex for simple UI. Let's simplify: Discard 1, Return 1, repeat n times?
                                        // Or just strictly implementation.
                                        // Let's re-queue interaction for remaining n-1.
                                        ctx.log(`弃置了 [${c.name}]。`);
                                        startReturnLoop(ctx, n); // After discard loop finishes? 
                                        // We need to finish discarding first.
                                        // Actually, let's just do N=1 for UI simplicity in this prompt context or 
                                        // force user to pick 1 by 1.
                                        // Let's implement "Discard Loop" then "Return Loop".
                                    } else {
                                        startReturnLoop(ctx, n);
                                    }
                                    // Hack: This only discards 1 card even if n > 1 for now due to UI limitations.
                                    // Supporting multi-select is hard. We'll assume n=1 for the 'card select' flow 
                                    // or update the logic to loop. 
                                    // Let's just assume "n" means executing the cycle n times.
                                    // Since we confirmed N, we are in the first discard.
                                    // We need to loop "Discard" N times.
                                    
                                    // FIX: Let's assume we handle N by queuing N interactions.
                                    // But here we are inside an OnConfirm.
                                    // Let's trigger a helper function that queues the discard.
                                }
                            }
                        }
                    });
                    
                    // Helper to handle the "Loop"
                    // Since React state updates are async and we rely on interaction overlays which are modal...
                    // We can't easily loop without daisy-chaining callbacks.
                    // For this implementation, let's restrict to n=1 effectively or handle the daisy chain.
                    // Daisy chain strategy:
                    // Discard(n) -> if n>0: Interaction(Discard) -> onSelect: DiscardCards, Discard(n-1)
                    // else: Return(originalN)
                    
                    // Implementation of daisy chain above is tricky inside this callback. 
                    // Let's just do logic for N=1 to satisfy basic requirement or hardcode the flow.
                    // Actually, let's rewrite to use a chain helper.
                    
                    setTimeout(() => startDiscardCycle(ctx, n, n), 100);
                }
            }
        }));
    },
    onDiscard: (ctx) => {
        destroyCard(ctx, ctx.card.instanceId);
        startReturnLoop(ctx, 1);
    }
};

const startDiscardCycle = (ctx: any, total: number, remaining: number) => {
    if (remaining === 0) {
        startReturnLoop(ctx, total);
        return;
    }
    
    ctx.setGameState((prev:any) => ({
        ...prev,
        interaction: {
            id: `death-discard-${remaining}`,
            playerId: ctx.sourcePlayerId,
            title: `星币·死神 (弃置 ${total-remaining+1}/${total})`,
            description: "弃置一张牌:",
            inputType: 'CARD_SELECT',
            cardsToSelect: prev[ctx.sourcePlayerId===1?'player1':'player2'].hand,
            onCardSelect: (c: any) => {
                 discardCards(ctx, ctx.sourcePlayerId, [c.instanceId]);
                 setTimeout(() => startDiscardCycle(ctx, total, remaining - 1), 200);
                 ctx.setGameState((s:any)=>s?({...s, interaction:null}):null);
            }
        }
    }));
};

const startReturnLoop = (ctx: any, remaining: number) => {
    if (remaining === 0) return;

    ctx.setGameState((prev:any) => {
        const p = prev[ctx.sourcePlayerId===1?'player1':'player2'];
        if (p.discardPile.length === 0) {
            ctx.log("弃牌堆为空，无法归来。");
            return { ...prev, interaction: null };
        }
        return {
            ...prev,
            interaction: {
                id: `death-return-${remaining}`,
                playerId: ctx.sourcePlayerId,
                title: `星币·死神 (归来 ${remaining})`,
                description: "选择一张牌归来:",
                inputType: 'CARD_SELECT',
                cardsToSelect: p.discardPile,
                onCardSelect: (c: any) => {
                     returnCard(ctx, c.instanceId);
                     setTimeout(() => startReturnLoop(ctx, remaining - 1), 200);
                     ctx.setGameState((s:any)=>s?({...s, interaction:null}):null);
                }
            }
        };
    });
};