
import { GameState, InteractionRequest, Card, PlayerState } from '../../../types';
import { calculateCardUtilityDetailed } from './aiLogic';

/**
 * AI DECISION MODULE
 * Handles complex choices that pause the game flow (InteractionRequest).
 */

export const handleAIInteraction = async (
    request: InteractionRequest,
    gameState: GameState,
    setGameState: React.Dispatch<React.SetStateAction<GameState | null>>
) => {
    const ai = gameState.player2;
    const opp = gameState.player1;

    console.log(`[AI Decision] Processing interaction: ${request.title} (${request.inputType})`);

    // --- HELPER: SELECT BEST/WORST CARD ---
    const getSortedCards = (cards: Card[], ascending: boolean = false) => {
        return cards.map(c => ({
            card: c,
            score: calculateCardUtilityDetailed(c, ai, opp, gameState).score
        })).sort((a, b) => ascending ? a.score - b.score : b.score - a.score);
    };

    // --- 1. CARD SELECTION LOGIC ---
    if (request.inputType === 'CARD_SELECT' && request.cardsToSelect) {
        const cards = request.cardsToSelect;
        let chosenCard: Card | null = null;

        // Context-aware logic based on Title or ID
        const lowerTitle = request.title.toLowerCase();
        const lowerDesc = request.description.toLowerCase();

        // A. DISCARD Scenarios (Choose WORST card)
        if (lowerTitle.includes('弃置') || lowerDesc.includes('弃置') || lowerTitle.includes('discard')) {
            const sorted = getSortedCards(cards, true); // True = Ascending (Lowest score first)
            chosenCard = sorted[0]?.card;
            console.log(`[AI Decision] Choosing card to DISCARD: ${chosenCard?.name}`);
        }
        // B. SELECT/SEARCH/REWARD Scenarios (Choose BEST card)
        else if (lowerTitle.includes('检索') || lowerTitle.includes('选择') || lowerTitle.includes('reward') || lowerTitle.includes('select')) {
            const sorted = getSortedCards(cards, false); // False = Descending (Highest score first)
            chosenCard = sorted[0]?.card;
            console.log(`[AI Decision] Choosing card to KEEP/PLAY: ${chosenCard?.name}`);
        }
        // C. FALLBACK (Random)
        else {
            chosenCard = cards[Math.floor(Math.random() * cards.length)];
        }

        if (chosenCard && request.onCardSelect) {
            request.onCardSelect(chosenCard);
            return;
        }
    }

    // --- 2. NUMBER INPUT LOGIC ---
    if (request.inputType === 'NUMBER_INPUT') {
        let val = request.min || 1;
        
        // Specific Logic for Treasure Cups/Pentacles Emperor (Paying HP)
        if (request.title.includes('宝藏·圣杯') || request.title.includes('星币·皇帝')) {
            // Heuristic: Don't kill self. Spend up to 25% of current HP safely.
            const safeSpend = Math.floor(ai.hp * 0.25);
            // If paying cost (e.g. 4HP per N), calculate max N
            const costPerUnit = request.title.includes('星币·皇帝') ? 4 : 1; 
            const maxAffordable = Math.floor(safeSpend / costPerUnit);
            
            val = Math.max(request.min || 1, Math.min(request.max || 1, maxAffordable));
            // Ensure at least min is picked if we aren't dying immediately, otherwise min.
            if (ai.hp - (val * costPerUnit) <= 0) val = request.min || 1; 
        } 
        else {
            // Default: Pick middle or max depending on context? 
            // Usually "Choose X targets" -> Max is better.
            // "Discard X" -> Min is better.
            if (request.title.includes('弃置') || request.title.includes('Discard')) {
                val = request.min || 1;
            } else {
                val = request.max || 1;
            }
        }

        console.log(`[AI Decision] Numeric Input: ${val}`);
        if (request.onConfirm) request.onConfirm(val);
        return;
    }

    // --- 3. BUTTON OPTIONS LOGIC ---
    if (request.options && request.options.length > 0) {
        // Evaluate options based on keywords in labels
        const preferredKeywords = ['确认', '激活', '保留', '获取', 'Confirm', 'Activate', 'Keep', 'Draw'];
        const avoidKeywords = ['取消', '撤销', '不发动', 'Cancel', 'Skip'];

        let bestOptionIndex = -1;

        // Specific Logic: Pentacles Moon (Draw vs Discard)
        if (request.title.includes('星币·月亮')) {
            // If hand full, discard. If hand empty, draw.
            const needsCards = ai.hand.length < 3;
            bestOptionIndex = request.options.findIndex(o => needsCards ? o.label.includes('抽') : o.label.includes('弃'));
        }
        
        // Specific Logic: Treasure Pentacles (Choice)
        if (request.title.includes('宝藏·星币')) {
            // Priority: Field > Mark > Quest
            // Simple heuristic check labels
            const fieldIdx = request.options.findIndex(o => o.label.includes('场地'));
            const markIdx = request.options.findIndex(o => o.label.includes('标记'));
            
            if (fieldIdx !== -1 && !gameState.field) bestOptionIndex = fieldIdx;
            else if (markIdx !== -1) bestOptionIndex = markIdx;
        }

        // Fallback: Check keywords
        if (bestOptionIndex === -1) {
            bestOptionIndex = request.options.findIndex(o => preferredKeywords.some(k => o.label.includes(k)));
        }

        // Fallback: Random
        if (bestOptionIndex === -1) {
            bestOptionIndex = Math.floor(Math.random() * request.options.length);
        }

        console.log(`[AI Decision] Selected Option: ${request.options[bestOptionIndex].label}`);
        request.options[bestOptionIndex].action();
        return;
    }

    // Safety fallback
    console.warn("[AI Decision] No valid interaction path found. Dismissing.");
    setGameState(prev => prev ? ({ ...prev, interaction: null }) : null);
};
