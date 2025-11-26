import { CardDefinition, CardSuit, Keyword, InstantWindow } from '../../../types';
import { lockRandomCard } from '../../../services/actions';

export const SWORDS_JUDGMENT: CardDefinition = {
    id: 'swords-judgment', name: '宝剑·审判', suit: CardSuit.SWORDS, rank: 320,
    keywords: [Keyword.LOCK],
    onDraw: (ctx) => {
        // On Draw: Triggered before Set Phase. Lock for 1 turn (until next cleanup).
        lockRandomCard(ctx, 1, 1, 1);
        lockRandomCard(ctx, 2, 1, 1);
    },
    onReveal: (ctx) => {
        // On Reveal: Triggered in Round X. Cleanup happens at end of Round X (duration -1).
        // If duration is 1, it becomes 0 and unlocks for Round X+1.
        // We want it locked for Round X+1. So duration must be 2.
        lockRandomCard(ctx, 1, 1, 2);
        lockRandomCard(ctx, 2, 1, 2);
    },
    canInstant: () => true,
    onInstant: (ctx) => {
        const win = ctx.gameState.instantWindow;
        // Before Set: Lock for this turn (1).
        // After Reveal: Lock for next turn (2).
        const duration = (win === InstantWindow.BEFORE_SET || win === InstantWindow.BEFORE_REVEAL) ? 1 : 2;
        lockRandomCard(ctx, 1, 1, duration);
        lockRandomCard(ctx, 2, 1, duration);
    },
    onDiscard: (ctx) => {
        // On Discard: Happens right before cleanup.
        // Needs duration 2 to survive immediate cleanup and next turn.
        lockRandomCard(ctx, 1, 1, 2);
        lockRandomCard(ctx, 2, 1, 2);
    }
};