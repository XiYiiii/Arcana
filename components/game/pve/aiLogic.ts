
import { Card, PlayerState, GameState, AITag } from '../../../types';
import { isTreasureInVault } from '../../../services/actions';

/**
 * INTELLIGENT AI UTILITY SCORING (Tag-Based)
 * 
 * Instead of hardcoding "If card is Death, do X", we now look at tags.
 * "I need healing? Find cards with HEAL tag."
 * "I want to kill? Find cards with DAMAGE tag."
 */
export const calculateCardUtilityDetailed = (card: Card, ai: PlayerState, opp: PlayerState, gameState: GameState): { score: number, reasons: string[] } => {
    let score = 50; // Base score to keep RNG active for neutral plays
    const reasons: string[] = ["基础分: 50"];

    // --- 1. STATE ASSESSMENT (Context) ---
    const maxHp = 40; // Approx standard max HP
    
    // Survival Factor (0.0 - 1.0+): How desperate am I for health?
    // Increases non-linearly as HP drops.
    let survivalFactor = (maxHp - ai.hp) / maxHp; 
    if (ai.hp <= 12) survivalFactor *= 2; // Panic mode
    if (ai.hp <= 6) survivalFactor *= 4; // Critical mode

    // Aggression Factor (0.0 - 1.0): How much do I want to attack?
    // Higher if I have high ATK or opponent is weak.
    let aggressionFactor = 0.5;
    if (opp.hp <= ai.atk * 3) aggressionFactor += 0.5; // Kill range close
    if (ai.hp > 25) aggressionFactor += 0.2; // Healthy enough to trade

    // Resource Factor (0.0 - 1.0): Do I need cards?
    const handFullness = ai.hand.length / ai.maxHandSize;
    const resourceNeed = 1.0 - handFullness; // 1.0 = Empty hand, 0.0 = Full

    // Field Factor
    const currentField = gameState.field;
    let fieldAdvantage = 0.5; // Neutral
    if (!currentField) fieldAdvantage = 1.0; // Free real estate
    else if (currentField.ownerId !== ai.id) fieldAdvantage = 1.5; // Crush enemy field
    else fieldAdvantage = -0.5; // Don't overwrite own field usually

    // --- 2. TAG SCORING (On Reveal) ---
    // We look at what the card DOES when played (On Reveal)
    const tags = card.aiTags?.onReveal || [];

    // Special: Treasure is always good
    if (card.isTreasure) {
        score += 150;
        reasons.push("宝藏牌: +150");
    }

    // Special: Locked cards cannot be played (Should be filtered out before, but safe check)
    if (card.isLocked) {
        return { score: -9999, reasons: ["已锁定: -9999"] };
    }

    tags.forEach(tag => {
        switch (tag) {
            case AITag.DAMAGE: {
                // Base damage utility
                let dmgScore = (ai.atk * 5); 
                
                // Aggression modifier
                dmgScore *= (1 + aggressionFactor);

                // Lethality Check (Simple estimate)
                let estimatedDmg = ai.atk;
                // Heuristic: If card name suggests multiplier, boost estimate (Optional, kept simple for now)
                if (card.name.includes('太阳')) estimatedDmg *= 2;
                
                if (estimatedDmg >= opp.hp) {
                    score += 10000;
                    reasons.push("斩杀可能: +10000");
                } else {
                    score += dmgScore;
                    reasons.push(`伤害价值: +${dmgScore.toFixed(0)}`);
                }
                break;
            }
            case AITag.HEAL: {
                // Value depends entirely on missing HP
                if (ai.hp >= maxHp) {
                    score -= 20;
                    reasons.push("满血无需治疗: -20");
                } else {
                    const healScore = 40 * survivalFactor;
                    score += healScore;
                    reasons.push(`治疗需求: +${healScore.toFixed(0)}`);
                }
                break;
            }
            case AITag.DRAW: {
                // Value depends on empty hand
                const drawScore = 30 * (1 + resourceNeed * 2);
                // Penalty if hand is full
                if (ai.hand.length >= ai.maxHandSize) {
                    score -= 10;
                    reasons.push("手牌已满: -10");
                } else {
                    score += drawScore;
                    reasons.push(`过牌价值: +${drawScore.toFixed(0)}`);
                }
                break;
            }
            case AITag.DISCARD: {
                // Usually negative to discard self, unless specific strategy
                if (ai.hand.length <= 1) {
                    score -= 30; // Don't discard last card
                    reasons.push("手牌过少忌弃: -30");
                } else {
                    // Check if we have "Bad" cards to discard? Too complex for simple AI.
                    // Assume discard is cost.
                    score -= 10; 
                    reasons.push("弃牌代价: -10");
                }
                break;
            }
            case AITag.FIELD: {
                const fieldScore = 40 * fieldAdvantage;
                score += fieldScore;
                reasons.push(`场地价值: ${fieldScore > 0 ? '+' : ''}${fieldScore.toFixed(0)}`);
                break;
            }
            case AITag.BUFF:
            case AITag.DEBUFF:
            case AITag.CONTROL: {
                score += 35; // Generic utility
                reasons.push("控场/增益: +35");
                break;
            }
            case AITag.SPECIAL: {
                score += 20; // Quest or special interactions
                reasons.push("特殊效果: +20");
                break;
            }
            case AITag.TRANSFORM: {
                score += 10; // Chaos
                reasons.push("变化效果: +10");
                break;
            }
        }
    });

    // --- 3. OPPORTUNITY COST (Instant Check) ---
    // If a card is also a powerful Instant, maybe we should keep it?
    const instantTags = card.aiTags?.onInstant || [];
    if (instantTags.length > 0 && card.canInstant && !card.isTreasure) {
        // High value instants
        const isDefensive = instantTags.includes(AITag.HEAL) || instantTags.includes(AITag.BUFF) || instantTags.includes(AITag.CONTROL);
        
        // If I'm not dying, save defensive instants
        if (isDefensive && survivalFactor < 0.5) {
            score -= 40;
            reasons.push("保留用于反制: -40");
        }
        // If I'm dying (survival > 0.8), I might ignore this penalty because I need to play ANYTHING to live, 
        // OR the onReveal HEAL score will outweigh this penalty naturally.
    }

    // --- 4. SAFETY CHECK (Self Damage) ---
    // Parsing description for safety is safer than tagging every single self-damage card manually if we missed some.
    // "自伤", "双方", "扣除" + "Hp"
    const desc = card.description || "";
    if (tags.includes(AITag.DAMAGE) || tags.includes(AITag.SPECIAL)) {
        const touchesSelf = desc.includes("自伤") || desc.includes("双方") || desc.includes("扣除己方");
        if (touchesSelf) {
            // Rough estimate: suicide risk
            if (ai.hp <= 4) {
                score -= 500;
                reasons.push("自杀风险: -500");
            } else if (ai.hp <= 8) {
                score -= 50;
                reasons.push("低血忌自伤: -50");
            }
        }
    }

    // --- 6. COMBO / CONTEXT SPECIFIC (Legacy/Specifics) ---
    // Treasure Retrieval Check
    if (card.name.includes('皇帝') && !card.isTreasure) {
        let treasureId = '';
        if (card.suit === 'CUPS') treasureId = 'treasure-cups';
        else if (card.suit === 'WANDS') treasureId = 'treasure-wands';
        else if (card.suit === 'SWORDS') treasureId = 'treasure-swords';
        else if (card.suit === 'PENTACLES') treasureId = 'treasure-pentacles';

        if (treasureId && !isTreasureInVault(gameState, treasureId)) {
            score -= 100;
            reasons.push("宝库已空: -100");
        }
    }

    // Wands Star Quest Check
    if (card.name.includes('权杖·星星')) {
        const hasSun = ai.deck.some(c => c.name.includes('太阳'));
        const hasMoon = ai.deck.some(c => c.name.includes('月亮'));
        if (hasSun || hasMoon) {
            score += 50;
            reasons.push("检索日月: +50");
        }
    }

    // --- 5. TIE BREAKER (Speed) ---
    // Prefer lower rank (faster) cards slightly.
    // Lower rank = Higher priority.
    // We penalize high rank (slow) cards.
    // Factor: 0.02. Rank 100 -> -2. Rank 400 -> -8.
    const speedPenalty = card.rank * 0.02;
    score -= speedPenalty;
    reasons.push(`速度修正(Rank${card.rank}): -${speedPenalty.toFixed(1)}`);

    return { score, reasons };
};
