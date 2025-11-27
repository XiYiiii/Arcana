
import { EffectContext, PlayerState } from '../../types';
import { getTargetId, addMarkToCard, checkPentaclesWheelActivation } from './utils';
import { updateQuestProgress } from './quests';

// Calculate Damage with Mark checks
const calculateDamageReceived = (player: PlayerState, amount: number): number => {
  let finalDamage = amount;
  // MARK: CUPS FOOL - "Damage + 1" if holding marked card
  const foolCards = player.hand.filter(c => c.marks.includes('mark-cups-fool'));
  if (foolCards.length > 0) {
    finalDamage += foolCards.length;
  }
  
  // SWORDS FOOL Instant - Double Damage
  if (player.nextDamageDouble) {
      finalDamage *= 2;
  }

  return Math.max(0, finalDamage);
};

export const damagePlayer = (ctx: EffectContext, targetId: number, amount: number, isPiercing: boolean = false) => {
  const finalTargetId = getTargetId(ctx, targetId);
  const sourceId = finalTargetId === 1 ? 2 : 1; 

  ctx.setGameState(prev => {
    if (!prev) return null;
    const key = finalTargetId === 1 ? 'player1' : 'player2';
    const sourceKey = sourceId === 1 ? 'player1' : 'player2';
    
    let p = prev[key];
    let source = prev[sourceKey];

    // Logic: Pentacles World Effect (Global Piercing) check on SOURCE
    const effectiveIsPiercing = isPiercing || source.piercingDamageThisTurn;

    // Logic: Swords Priestess Instant (Convert Incoming > Atk to Heal)
    if (p.incomingDamageConversion) {
        if (amount > p.atk) {
            ctx.log(`[女祭司] ${p.name} 将伤害转化为治疗！(+${amount} HP)`);
            const healedHp = p.preventHealing ? p.hp : p.hp + amount;
            return {
                ...prev,
                [key]: { ...p, hp: healedHp, incomingDamageConversion: false }
            };
        }
    }

    // Logic: Immunity
    if (p.immunityThisTurn && !effectiveIsPiercing) {
      ctx.log(`[防御] ${p.name} 免疫了伤害！`);
      return prev;
    }

    const actualDmg = calculateDamageReceived(p, amount);
    
    if (ctx.isReversed) {
       ctx.log(`[反转] 伤害目标变为 ${p.name}！`);
    }

    let newHp = p.hp - actualDmg;
    const damageDealt = p.hp - newHp;

    ctx.log(`[伤害] ${p.name} 受到了 ${damageDealt} 点${effectiveIsPiercing ? '穿透' : ''}伤害！`);
    
    // Accumulate Damage Taken for Pentacles Judgment check
    const newDamageTakenThisTurn = p.damageTakenThisTurn + damageDealt;
    
    const nextDamageDouble = false; 

    let extraSelfDmg = 0;
    if (damageDealt > 0 && p.damageReflection) {
        ctx.log(`[女祭司] 自伤反噬！`);
        extraSelfDmg = 1;
    }
    newHp -= extraSelfDmg;

    // Check Death Prevention Field (Swords Death)
    if (newHp < 0 && prev.field?.active && prev.field.card.name.includes('宝剑·死神')) {
         ctx.log(`[场地] 宝剑·死神发动！${p.name} 免于死亡，Hp变为1。场地崩塌。`);
         newHp = 1;
         // Field removal handled below
    }

    let sourceHeal = 0;
    if (source.hasLifesteal && damageDealt > 0) {
        sourceHeal = damageDealt;
        ctx.log(`[女祭司] ${source.name} 吸取了 ${sourceHeal} 点生命！`);
    }

    let sourceSelfDmg = 0;
    const loversMark = source.hand.some(c => c.marks.includes('mark-swords-lovers'));
    if (loversMark && damageDealt > 0) {
        sourceSelfDmg = 1;
        ctx.log(`[恋人] ${source.name} 因造成伤害而受到反噬！`);
    }

    // Swords Hanged Man: Reflect dealt damage to self
    let hangedManSelfDmg = 0;
    let hangedManMarksToAdd = 0;
    if (source.swordsHangedManActive && damageDealt > 0) {
         hangedManSelfDmg = damageDealt;
         hangedManMarksToAdd = damageDealt;
         ctx.log(`[倒吊人] ${source.name} 因造成伤害而承受同等伤害并标记手牌！`);
    }

    // Apply Changes
    const newSourceHp = source.hp + (source.preventHealing ? 0 : sourceHeal) - sourceSelfDmg - hangedManSelfDmg;
    
    // Apply Hanged Man Marks
    let newSourceHand = [...source.hand];
    if (hangedManMarksToAdd > 0) {
        let markedCount = 0;
        newSourceHand = newSourceHand.map(c => {
             if (markedCount < hangedManMarksToAdd && !c.marks.includes('mark-swords-hangedman')) {
                 markedCount++;
                 return addMarkToCard(c, 'mark-swords-hangedman');
             }
             return c;
        });
    }

    let finalField = prev.field;
    let finalP1Discard = prev.player1.discardPile;
    let finalP2Discard = prev.player2.discardPile;

    // Handle Swords Death Field Removal if triggered
    if ((p.hp - actualDmg - extraSelfDmg) < 0 && prev.field?.active && prev.field.card.name.includes('宝剑·死神')) {
        const fieldOwnerId = prev.field.ownerId;
        const card = prev.field.card;
        finalField = null;
        if (fieldOwnerId === 1) finalP1Discard = [...finalP1Discard, card];
        else finalP2Discard = [...finalP2Discard, card];
    }

    // Construct final objects
    const finalP = { ...p, hp: newHp, nextDamageDouble, damageTakenThisTurn: newDamageTakenThisTurn };
    const finalSource = { ...source, hp: newSourceHp, hand: newSourceHand };

    // Need to assign correct P1/P2
    const p1State = key === 'player1' ? finalP : finalSource;
    const p2State = key === 'player2' ? finalP : finalSource;
    
    // Merge potential discard updates from field removal
    if (prev.field?.active && prev.field.card.name.includes('宝剑·死神') && (p.hp - actualDmg - extraSelfDmg) < 0) {
        if (prev.field.ownerId === 1) p1State.discardPile = finalP1Discard;
        else p2State.discardPile = finalP2Discard;
    }

    const intermediateState = {
      ...prev,
      player1: p1State,
      player2: p2State,
      field: finalField
    };

    return checkPentaclesWheelActivation(intermediateState);
  });
  
  if (amount > 0) {
      // Trigger quests based on damage taken
      setTimeout(() => {
          const fid = getTargetId(ctx, targetId); // The one taking damage
          const sid = fid === 1 ? 2 : 1; // The source of damage

          // Quest: Pentacles Priestess (Take Damage)
          updateQuestProgress(ctx, fid, 'quest-pentacles-priestess', amount);

          // Quest: Swords World (Deal Damage)
          updateQuestProgress(ctx, sid, 'quest-swords-world', amount);
      }, 50);
  }
};
