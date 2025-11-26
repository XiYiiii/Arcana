

import { CardDefinition, CardSuit, Keyword, Card } from '../../../types';
import { modifyPlayer, addMarkToCard } from '../../../services/actions';

export const CUPS_MOON: CardDefinition = {
    id: 'cups-moon', name: '圣杯·月亮', suit: CardSuit.CUPS, rank: 118,
    keywords: [Keyword.IMPRINT],
    onReveal: (ctx) => {
        ctx.setGameState(prev => ({
            ...prev!,
            interaction: {
                id: `moon-cleanse-${Date.now()}`,
                playerId: ctx.sourcePlayerId,
                title: "圣杯·月亮",
                description: "选择清除谁的标记？",
                options: [
                    { label: "己方", action: () => cleanAllMarks(ctx, ctx.sourcePlayerId) },
                    { label: "对方", action: () => cleanAllMarks(ctx, ctx.sourcePlayerId === 1 ? 2 : 1) }
                ]
            }
        }));
    },
    onDiscard: (ctx) => {
        // Randomly clean 1 mark from ANY card (Hand/Field) of BOTH players
        const cleanRandom = (pid: number) => {
            modifyPlayer(ctx, pid, p => {
                const allCards = [...p.hand, ...(p.fieldSlot ? [p.fieldSlot] : [])];
                const markedCards = allCards.filter(c => c.marks.length > 0);
                if (markedCards.length === 0) return p;
                
                const randCard = markedCards[Math.floor(Math.random() * markedCards.length)];
                
                // Remove one mark? Or all marks from that card? "Clear mark of a card" implies clearing that card.
                const newMarks = []; // Clear all
                
                const updateCard = (c: Card) => c.instanceId === randCard.instanceId ? { ...c, marks: newMarks } : c;
                
                return {
                    ...p,
                    hand: p.hand.map(updateCard),
                    fieldSlot: p.fieldSlot ? updateCard(p.fieldSlot) : null
                };
            });
        };
        cleanRandom(1);
        cleanRandom(2);
    }
};

const cleanAllMarks = (ctx: any, targetId: number) => {
    let removedCount = 0;
    modifyPlayer(ctx, targetId, p => {
        const clean = (c: Card) => {
            if (c.marks.length > 0) {
                removedCount += c.marks.length;
                return { ...c, marks: [] };
            }
            return c;
        };
        return {
            ...p,
            hand: p.hand.map(clean),
            fieldSlot: p.fieldSlot ? clean(p.fieldSlot) : null
        };
    });
    // Heal the user of the card (Source), not the target? 
    // Description: "Recover 2 HP". Usually implies the user of the card.
    modifyPlayer(ctx, ctx.sourcePlayerId, p => ({ ...p, hp: p.hp + removedCount * 2 }));
    ctx.setGameState((s:any) => s ? ({...s, interaction: null}) : null);
};