
import { Card, PlayerState, GameState, AITag } from '../../../types';
import { isTreasureInVault } from '../../../services/actions';

/**
 * ADVENTURE AI UTILITY SCORING
 * (1:1 Copy from PVE)
 */
export const calculateCardUtilityDetailed = (card: Card, ai: PlayerState, opp: PlayerState, gameState: GameState): { score: number, reasons: string[] } => {
    let score = 50; 
    const reasons: string[] = ["基础分: 50"];

    const maxHp = 40; 
    let survivalFactor = (maxHp - ai.hp) / maxHp; 
    if (ai.hp <= 12) survivalFactor *= 2; 
    if (ai.hp <= 6) survivalFactor *= 4; 

    let aggressionFactor = 0.5;
    if (opp.hp <= ai.atk * 3) aggressionFactor += 0.5; 
    if (ai.hp > 25) aggressionFactor += 0.2; 

    const handFullness = ai.hand.length / ai.maxHandSize;
    const resourceNeed = 1.0 - handFullness; 

    const currentField = gameState.field;
    let fieldAdvantage = 0.5; 
    if (!currentField) fieldAdvantage = 1.0; 
    else if (currentField.ownerId !== ai.id) fieldAdvantage = 1.5; 
    else fieldAdvantage = -0.5; 

    const tags = card.aiTags?.onReveal || [];

    if (card.isTreasure) {
        score += 150;
        reasons.push("宝藏牌: +150");
    }

    if (card.isLocked) {
        return { score: -9999, reasons: ["已锁定: -9999"] };
    }

    tags.forEach(tag => {
        switch (tag) {
            case AITag.DAMAGE: {
                let dmgScore = (ai.atk * 5); 
                dmgScore *= (1 + aggressionFactor);
                let estimatedDmg = ai.atk;
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
                const drawScore = 30 * (1 + resourceNeed * 2);
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
                if (ai.hand.length <= 1) {
                    score -= 30; 
                    reasons.push("手牌过少忌弃: -30");
                } else {
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
                score += 35; 
                reasons.push("控场/增益: +35");
                break;
            }
            case AITag.SPECIAL: {
                score += 20; 
                reasons.push("特殊效果: +20");
                break;
            }
            case AITag.TRANSFORM: {
                score += 10; 
                reasons.push("变化效果: +10");
                break;
            }
        }
    });

    const instantTags = card.aiTags?.onInstant || [];
    if (instantTags.length > 0 && card.canInstant && !card.isTreasure) {
        const isDefensive = instantTags.includes(AITag.HEAL) || instantTags.includes(AITag.BUFF) || instantTags.includes(AITag.CONTROL);
        if (isDefensive && survivalFactor < 0.5) {
            score -= 40;
            reasons.push("保留用于反制: -40");
        }
    }

    const desc = card.description || "";
    if (tags.includes(AITag.DAMAGE) || tags.includes(AITag.SPECIAL)) {
        const touchesSelf = desc.includes("自伤") || desc.includes("双方") || desc.includes("扣除己方");
        if (touchesSelf) {
            if (ai.hp <= 4) {
                score -= 500;
                reasons.push("自杀风险: -500");
            } else if (ai.hp <= 8) {
                score -= 50;
                reasons.push("低血忌自伤: -50");
            }
        }
    }

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

    if (card.name.includes('权杖·星星')) {
        const hasSun = ai.deck.some(c => c.name.includes('太阳'));
        const hasMoon = ai.deck.some(c => c.name.includes('月亮'));
        if (hasSun || hasMoon) {
            score += 50;
            reasons.push("检索日月: +50");
        }
    }

    const speedPenalty = card.rank * 0.02;
    score -= speedPenalty;
    reasons.push(`速度修正(Rank${card.rank}): -${speedPenalty.toFixed(1)}`);

    return { score, reasons };
};
