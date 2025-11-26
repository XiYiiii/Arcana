import { CardDefinition, CardSuit, Keyword, Card } from '../../../types';
import { modifyPlayer, damagePlayer, drawCards, getOpponentId, discardCards, seizeCard } from '../../../services/actions';

export const WANDS_STRENGTH: CardDefinition = {
    id: 'wands-strength', name: '权杖·力量', suit: CardSuit.WANDS, rank: 208,
    keywords: [Keyword.INVALIDATE],
    onReveal: (ctx) => {
       const oppId = getOpponentId(ctx.sourcePlayerId);
       let drawnCards: Card[] = [];
       
       // Draw 3 cards from deck, NOT adding to hand, directly to discard pile (Invalidate trigger effect is implicit by not playing them)
       modifyPlayer(ctx, ctx.sourcePlayerId, p => {
           drawnCards = p.deck.slice(0, 3);
           const newDeck = p.deck.slice(3);
           return { ...p, deck: newDeck, discardPile: [...p.discardPile, ...drawnCards] };
       });

       if (drawnCards.length === 0) {
           ctx.log("牌堆已空，无牌可抽。");
           return;
       }
       
       let cups = 0, swords = 0, wands = 0, pentacles = 0;
       drawnCards.forEach(c => {
           if (c.suit === CardSuit.CUPS) cups++;
           if (c.suit === CardSuit.SWORDS) swords++;
           if (c.suit === CardSuit.WANDS) wands++;
           if (c.suit === CardSuit.PENTACLES) pentacles++;
       });
       
       const details = drawnCards.map(c => `[${c.name}]`).join(', ');
       ctx.log(`【力量】抽取弃置: ${details}`);
       ctx.log(`统计: 🏆${cups} ⚔️${swords} 🪄${wands} 🪙${pentacles}`);

       // Execute effects
       if (cups > 0) {
           // Discard 1 card per Cup
           ctx.log(`(圣杯) 弃置 ${cups} 张手牌`);
           // For simplicity in automatic resolution, we discard random/first cards if interactive selection is too complex for this chain.
           // Or queue interaction. Let's discard random for now to keep flow smooth.
           modifyPlayer(ctx, ctx.sourcePlayerId, p => {
               const toDiscard = p.hand.filter(c => !c.isTreasure).slice(0, cups).map(c => c.instanceId);
               // We need to use discardCards action to trigger hooks properly? 
               // "Discard 1 card". Let's use the helper but inside timeout to separate logs.
               setTimeout(() => discardCards(ctx, ctx.sourcePlayerId, toDiscard), 100);
               return p; 
           });
       }

       if (swords > 0) {
           // Deal 2 damage per Sword
           const dmg = 2 * swords;
           ctx.log(`(宝剑) 造成 ${dmg} 点伤害`);
           damagePlayer(ctx, oppId, dmg);
       }

       if (wands > 0) {
           // Draw 1 card per Wand
           ctx.log(`(权杖) 抽取 ${wands} 张牌`);
           drawCards(ctx, ctx.sourcePlayerId, wands);
       }

       if (pentacles > 0) {
           // Opponent chooses to swap 1 card per Pentacle.
           // "Swap" implies give 1, take 1.
           // We will prompt opponent to select 1 card to give to me. Then I give 1 random card back.
           // Since this is complex to queue multiple times, let's trigger it once if count > 0, or loop.
           // Prompt says "For EVERY Pentacles card...".
           startSwapLoop(ctx, pentacles);
       }
    }
};

const startSwapLoop = (ctx: any, remaining: number) => {
    if (remaining <= 0) return;
    
    const oppId = getOpponentId(ctx.sourcePlayerId);
    const oppKey = oppId === 1 ? 'player1' : 'player2';
    
    ctx.setGameState((prev: any) => {
        if(!prev) return null;
        const oppHand = prev[oppKey].hand;
        if (oppHand.length === 0) {
            ctx.log("对手无牌可交换。");
            return prev;
        }

        return {
            ...prev,
            interaction: {
                id: `wands-strength-swap-${remaining}`,
                playerId: oppId, // Opponent interaction
                title: `权杖·力量 - 强制交换 (${remaining})`,
                description: "对方发动了交换效果。请选择一张手牌交给对方：",
                inputType: 'CARD_SELECT',
                cardsToSelect: oppHand,
                onCardSelect: (c: Card) => {
                    // 1. Opponent gives card C to Source
                    seizeCard({ ...ctx, sourcePlayerId: ctx.sourcePlayerId }, c.instanceId); // Me seize Opp card (Simulates opp giving it)
                    
                    // 2. Source gives random card to Opponent
                    setTimeout(() => {
                        modifyPlayer(ctx, ctx.sourcePlayerId, p => {
                            if(p.hand.length === 0) return p;
                            const r = Math.floor(Math.random() * p.hand.length);
                            const giveCard = p.hand[r];
                            
                            // Move giveCard to Opponent
                            modifyPlayer({ ...ctx, sourcePlayerId: oppId }, oppId, op => ({ ...op, hand: [...op.hand, giveCard] }));
                            ctx.log(`交换：${p.name} 将 [${giveCard.name}] 交给了对手。`);
                            
                            return { ...p, hand: p.hand.filter(x => x.instanceId !== giveCard.instanceId) };
                        });
                        
                        // Next Loop
                        setTimeout(() => startSwapLoop(ctx, remaining - 1), 300);
                        
                    }, 200);
                    
                    ctx.setGameState((s:any) => s ? ({...s, interaction: null}) : null);
                }
            }
        };
    });
};