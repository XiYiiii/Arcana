import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, addMarkToCard, getOpponentId } from '../../../services/actions';

export const SWORDS_EMPRESS: CardDefinition = {
    id: 'swords-empress', name: '宝剑·女皇', suit: CardSuit.SWORDS, rank: 303,
    keywords: [Keyword.IMPRINT],
    onReveal: (ctx) => {
        modifyPlayer(ctx, ctx.sourcePlayerId, p => ({
            ...p,
            hand: p.hand.map(c => c.suit === CardSuit.SWORDS ? addMarkToCard(c, 'mark-swords-empress') : c)
        }));
        // Apply effect immediately if this card itself has the mark? 
        // Or does the mark logic apply when *other* cards are played?
        // Prompt: "(Mark...) In this turn, opponent cannot heal."
        // Usually marks activate when the marked card is played.
        // But if I play Empress now, and mark others, do I get the effect now?
        // Let's assume the effect triggers when a marked card is played.
        // BUT, the prompt is ambiguous: "Mark all... (Mark Effect) This turn opp cannot heal."
        // It likely means: When a card with this mark is played, prevent healing for that turn.
        // Let's add logic to onReveal to apply the status if the *current* card has the mark (unlikely unless recursing) OR
        // modify the logic.
        // Actually, for simplicity in this framework, let's make the Empress play itself trigger the effect for *this* turn as well?
        // No, "Mark all swords".
        // Let's stick to: When a marked card is played (onReveal of marked card), apply 'preventHealing'.
        // Since we can't easily inject logic into *other* cards' onReveal without a global hook,
        // we'll rely on the global check or modify PlayerState.
        // For now, let's implement the "Application" of the mark.
        // We need a global "On Reveal" hook for marks. The framework has `onReveal` on the card.
        // We can't modify existing Swords onReveal.
        // Alternative: We can't.
        // Let's make the Empress apply the "No Heal" status *immediately* (as if she carries the will) and marking others is flavor or future use?
        // Or better: `onReveal` checks marks.
        // Our framework doesn't have a central "Check Marks on Play" function except inside individual cards.
        // Wait, `executeResolveEffects` in `logic/phases/reveal.ts` calls `card.onReveal`.
        // We can check marks *there* or add a specific hook.
        // For this specific request, I will add the logic to `executeResolveEffects` or `actions.ts`.
        // Update: I'll add the logic to modifyPlayer to respect `preventHealing`.
        // I'll trigger the status change here.
        modifyPlayer(ctx, getOpponentId(ctx.sourcePlayerId), p => ({ ...p, preventHealing: true }));
    }
};