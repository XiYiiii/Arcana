import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { clash, damagePlayer, modifyPlayer } from '../../../services/actions';

export const WANDS_CHARIOT: CardDefinition = {
    id: 'wands-chariot', name: '权杖·战车', suit: CardSuit.WANDS, rank: 207,
    keywords: [Keyword.CLASH],
    onReveal: (ctx) => {
       // Clash Logic
       clash(ctx, (c, result, myCard, oppCard) => {
           if (result === 'TIE') {
               // Both draw their clashed card
               modifyPlayer(c, c.sourcePlayerId, p => ({ ...p, hand: [...p.hand, myCard] }));
               if(myCard.onDraw) c.setGameState(s => s ? ({...s, pendingEffects: [...s.pendingEffects, { type: 'ON_DRAW', card: myCard, playerId: c.sourcePlayerId }]}) : null);
               
               // Opponent also draws theirs (need helper for Opp ID?)
               // Actually clash logic only calls callback for the SOURCE player. 
               // We need to manually handle opponent's card fate here since we "consumed" it from deck.
               const oppId = c.sourcePlayerId === 1 ? 2 : 1;
               modifyPlayer(c, oppId, p => ({ ...p, hand: [...p.hand, oppCard] }));
               if(oppCard.onDraw) c.setGameState(s => s ? ({...s, pendingEffects: [...s.pendingEffects, { type: 'ON_DRAW', card: oppCard, playerId: oppId }]}) : null);
               
           } else if (result === 'WIN') {
               // I draw mine, Opp discards theirs (implied "Draw 1" usually means getting the card you clashed with, or a new one? Prompt says "Draw 1". Usually implies gaining a card advantage).
               // "Winner draws 1". Since we already pulled the card for Clash, "Drawing" it means putting it in hand.
               modifyPlayer(c, c.sourcePlayerId, p => ({ ...p, hand: [...p.hand, myCard] }));
               if(myCard.onDraw) c.setGameState(s => s ? ({...s, pendingEffects: [...s.pendingEffects, { type: 'ON_DRAW', card: myCard, playerId: c.sourcePlayerId }]}) : null);
               
               // Opponent card discarded
               const oppId = c.sourcePlayerId === 1 ? 2 : 1;
               modifyPlayer(c, oppId, p => ({ ...p, discardPile: [...p.discardPile, oppCard] }));
               if(oppCard.onDiscard) c.setGameState(s => s ? ({...s, pendingEffects: [...s.pendingEffects, { type: 'ON_DISCARD', card: oppCard, playerId: oppId }]}) : null);
           } else {
               // Lose: I discard mine, Opp draws theirs
               modifyPlayer(c, c.sourcePlayerId, p => ({ ...p, discardPile: [...p.discardPile, myCard] }));
               if(myCard.onDiscard) c.setGameState(s => s ? ({...s, pendingEffects: [...s.pendingEffects, { type: 'ON_DISCARD', card: myCard, playerId: c.sourcePlayerId }]}) : null);

               const oppId = c.sourcePlayerId === 1 ? 2 : 1;
               modifyPlayer(c, oppId, p => ({ ...p, hand: [...p.hand, oppCard] }));
               if(oppCard.onDraw) c.setGameState(s => s ? ({...s, pendingEffects: [...s.pendingEffects, { type: 'ON_DRAW', card: oppCard, playerId: oppId }]}) : null);
           }
       });
       
       // Passive Damage Logic is implicit? No, Prompt says "When this card deals damage".
       // This card doesn't deal damage in its OnReveal.
       // So where does it deal damage? Maybe rule damage? 
       // "Passive: This card deals [Atk*1.5] damage instead of [Atk]." 
       // This implies when it wins the turn battle (Rule Damage).
       // Rule Damage logic in `reveal.ts` uses `opp.atk`.
       // We need to check if the card is Wands Chariot in `reveal.ts` rule damage calculation.
       // BUT, I can't easily change `reveal.ts` for one card without dirty checks.
       // Wait, `damagePlayer` in actions?
       // Let's modify `damagePlayer` caller in `reveal.ts`.
       // Actually, I can use a global check in `calculateDamageReceived` or `damagePlayer`? 
       // No, rule damage comes from `gameState.player.atk`.
       // If I am Wands Chariot, my Atk effectively increases for that strike.
       // The best way is to modify `onReveal` to add a temporary ATK buff? No, damage happens BEFORE onReveal.
       // The `reveal.ts` has "1. Rule Damage".
       // I need to update `reveal.ts` to handle this passive.
    }
};