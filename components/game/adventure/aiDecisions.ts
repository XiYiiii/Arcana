
import { GameState, InteractionRequest, Card } from '../../../types';
import { calculateCardUtilityDetailed } from './aiLogic';

/**
 * ADVENTURE AI DECISION MODULE
 * (1:1 Copy from PVE)
 */

export const handleAIInteraction = async (
    request: InteractionRequest,
    gameState: GameState,
    setGameState: React.Dispatch<React.SetStateAction<GameState | null>>
) => {
    const ai = gameState.player2;
    const opp = gameState.player1;

    const getSortedCards = (cards: Card[], ascending: boolean = false) => {
        return cards.map(c => ({
            card: c,
            score: calculateCardUtilityDetailed(c, ai, opp, gameState).score
        })).sort((a, b) => ascending ? a.score - b.score : b.score - a.score);
    };

    if (request.inputType === 'CARD_SELECT' && request.cardsToSelect) {
        const cards = request.cardsToSelect;
        let chosenCard: Card | null = null;
        const lowerTitle = request.title.toLowerCase();
        const lowerDesc = request.description.toLowerCase();

        if (lowerTitle.includes('弃置') || lowerDesc.includes('弃置') || lowerTitle.includes('discard')) {
            const sorted = getSortedCards(cards, true);
            chosenCard = sorted[0]?.card;
        }
        else if (lowerTitle.includes('检索') || lowerTitle.includes('选择') || lowerTitle.includes('reward') || lowerTitle.includes('select')) {
            const sorted = getSortedCards(cards, false);
            chosenCard = sorted[0]?.card;
        }
        else {
            chosenCard = cards[Math.floor(Math.random() * cards.length)];
        }

        if (chosenCard && request.onCardSelect) {
            request.onCardSelect(chosenCard);
            return;
        }
    }

    if (request.inputType === 'NUMBER_INPUT') {
        let val = request.min || 1;
        if (request.title.includes('宝藏·圣杯') || request.title.includes('星币·皇帝')) {
            const safeSpend = Math.floor(ai.hp * 0.25);
            const costPerUnit = request.title.includes('星币·皇帝') ? 4 : 1; 
            const maxAffordable = Math.floor(safeSpend / costPerUnit);
            val = Math.max(request.min || 1, Math.min(request.max || 1, maxAffordable));
            if (ai.hp - (val * costPerUnit) <= 0) val = request.min || 1; 
        } 
        else {
            if (request.title.includes('弃置') || request.title.includes('Discard')) {
                val = request.min || 1;
            } else {
                val = request.max || 1;
            }
        }
        if (request.onConfirm) request.onConfirm(val);
        return;
    }

    if (request.options && request.options.length > 0) {
        const preferredKeywords = ['确认', '激活', '保留', '获取', 'Confirm', 'Activate', 'Keep', 'Draw'];
        let bestOptionIndex = -1;

        if (request.title.includes('星币·月亮')) {
            const needsCards = ai.hand.length < 3;
            bestOptionIndex = request.options.findIndex(o => needsCards ? o.label.includes('抽') : o.label.includes('弃'));
        }
        
        if (request.title.includes('宝藏·星币')) {
            const fieldIdx = request.options.findIndex(o => o.label.includes('场地'));
            const markIdx = request.options.findIndex(o => o.label.includes('标记'));
            if (fieldIdx !== -1 && !gameState.field) bestOptionIndex = fieldIdx;
            else if (markIdx !== -1) bestOptionIndex = markIdx;
        }

        if (bestOptionIndex === -1) {
            bestOptionIndex = request.options.findIndex(o => preferredKeywords.some(k => o.label.includes(k)));
        }

        if (bestOptionIndex === -1) {
            bestOptionIndex = Math.floor(Math.random() * request.options.length);
        }

        request.options[bestOptionIndex].action();
        return;
    }

    setGameState(prev => prev ? ({ ...prev, interaction: null }) : null);
};
