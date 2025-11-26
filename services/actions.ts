



import { EffectContext, PlayerState, GameState, Card, CardSuit, Quest, CardDefinition, VisualEvent } from '../types';
import { shuffleDeck, getArcanaNumber } from './gameUtils';
import { CARD_DEFINITIONS } from '../data/cards';

// --- Helper for State Mutation ---

export const getOpponentId = (id: number) => (id === 1 ? 2 : 1);

// Helper to resolve target ID respecting Reversal
export const getTargetId = (ctx: EffectContext, intendedTargetId: number): number => {
  if (!ctx.isReversed) return intendedTargetId;
  const oppId = getOpponentId(ctx.sourcePlayerId);
  if (intendedTargetId === ctx.sourcePlayerId) return oppId;
  if (intendedTargetId === oppId) return ctx.sourcePlayerId;
  return intendedTargetId; 
};

// Check Pentacles Wheel activation condition (MyHP >= 2 * OppHP)
const checkPentaclesWheelActivation = (prev: GameState): GameState => {
    if (!prev.field || !prev.field.card.name.includes('星币·命运之轮')) return prev;
    
    const ownerId = prev.field.ownerId;
    const oppId = getOpponentId(ownerId);
    
    const ownerHP = ownerId === 1 ? prev.player1.hp : prev.player2.hp;
    const oppHP = oppId === 1 ? prev.player1.hp : prev.player2.hp;
    
    const shouldBeActive = ownerHP >= 2 * oppHP;
    
    if (prev.field.active !== shouldBeActive) {
        return {
            ...prev,
            field: { ...prev.field, active: shouldBeActive }
        };
    }
    return prev;
};

export const modifyPlayer = (
  ctx: EffectContext, 
  targetId: number, 
  mod: (p: PlayerState) => PlayerState
) => {
  const finalTargetId = getTargetId(ctx, targetId);
  
  ctx.setGameState(prev => {
    if (!prev) return null;
    const key = finalTargetId === 1 ? 'player1' : 'player2';
    const currentState = prev[key];
    
    // Apply Modification
    let newState = mod(currentState);

    // Rule: Prevent Healing if flag is set
    if (currentState.preventHealing && newState.hp > currentState.hp) {
        ctx.log(`[禁疗] ${currentState.name} 无法恢复生命！`);
        newState.hp = currentState.hp;
    }

    // Passive: Wands Priestess (Double Heal & Discard Self)
    if (newState.hp > currentState.hp) {
        const priestessIndex = newState.hand.findIndex(c => c.name.includes('权杖·女祭司'));
        if (priestessIndex !== -1) {
            const healAmount = newState.hp - currentState.hp;
            ctx.log(`[权杖·女祭司] 被动触发！治疗量翻倍 (+${healAmount} -> +${healAmount * 2}) 并弃置自身。`);
            
            // Apply doubled healing
            newState.hp = currentState.hp + (healAmount * 2);
            
            // Discard the priestess
            const priestessCard = newState.hand[priestessIndex];
            const newHand = [...newState.hand];
            newHand.splice(priestessIndex, 1);
            newState.hand = newHand;
            newState.discardPile = [...newState.discardPile, priestessCard];
        }
    }
    
    const intermediateState = {
      ...prev,
      [key]: newState
    };

    // Check Field Activation after stats change
    return checkPentaclesWheelActivation(intermediateState);
  });
};

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
    if (p.immunityThisTurn && !isPiercing) {
      ctx.log(`[防御] ${p.name} 免疫了伤害！`);
      return prev;
    }

    const actualDmg = calculateDamageReceived(p, amount);
    
    if (ctx.isReversed) {
       ctx.log(`[反转] 伤害目标变为 ${p.name}！`);
    }

    let newHp = p.hp - actualDmg;
    const damageDealt = p.hp - newHp;

    ctx.log(`[伤害] ${p.name} 受到了 ${damageDealt} 点${isPiercing ? '穿透' : ''}伤害！`);
    
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
    const finalP = { ...p, hp: newHp, nextDamageDouble };
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

export const transformCard = (ctx: EffectContext, targetPlayerId: number, cardInstanceId: string) => {
    // Note: To avoid circular dependency, we access definitions inside the function
    const candidates = CARD_DEFINITIONS.filter(c => !c.isTreasure);

    ctx.setGameState(prev => {
        if(!prev) return null;
        const key = targetPlayerId === 1 ? 'player1' : 'player2';
        const p = prev[key];
        
        const cardInHand = p.hand.find(c => c.instanceId === cardInstanceId);
        
        // Find if card is in hand or is field
        let targetCard = cardInHand;
        let isField = false;
        if (!targetCard && p.fieldSlot?.instanceId === cardInstanceId) {
            targetCard = p.fieldSlot;
            isField = true;
        }

        if (!targetCard) return prev;
        
        if (targetCard.isTreasure) {
            ctx.log(`[变化失败] ${targetCard.name} 是宝藏牌，免疫变化！`);
            return prev;
        }

        const newDef = candidates[Math.floor(Math.random() * candidates.length)];
        const newCard: Card = {
            ...newDef,
            instanceId: targetCard.instanceId, // Preserve ID
            marks: targetCard.marks, // Preserve marks? Usually transform changes identity but maybe marks stick? Let's keep marks.
            description: newDef.description || ""
        };

        ctx.log(`[变化] ${p.name} 的 [${targetCard.name}] 变成了 [${newCard.name}]！`);

        // Check for Pentacles Fool Quest (Trigger for the source of the effect, usually ctx.sourcePlayerId)
        setTimeout(() => updateQuestProgress(ctx, ctx.sourcePlayerId, 'quest-pentacles-fool', 1), 50);

        // Check for Pentacles Fool Field Counter (Global)
        let newField = prev.field;
        if (newField && newField.card.name.includes('星币·愚者')) {
             const newCounter = newField.counter + 1;
             let newActive = newField.active;
             if (newCounter >= 2) {
                 newActive = true;
                 ctx.log(`[场地] 星币·愚者激活！下一次抽牌将被变化。`);
             }
             newField = { ...newField, counter: newCounter, active: newActive };
        }

        const newHand = p.hand.map(c => c.instanceId === cardInstanceId ? newCard : c);
        const newFieldSlot = isField ? newCard : p.fieldSlot;
        
        // Also check Deck (for Hermit)
        const newDeck = p.deck.map(c => c.instanceId === cardInstanceId ? newCard : c);

        const visualEvent: VisualEvent = {
            id: `transform-${Date.now()}`,
            type: 'TRANSFORM_CARD',
            fromPid: targetPlayerId, // Using fromPid to indicate location of transform
            cardName: newCard.name
        };

        return {
            ...prev,
            [key]: { ...p, hand: newHand, fieldSlot: newFieldSlot, deck: newDeck },
            field: newField,
            visualEvents: [...prev.visualEvents, visualEvent]
        };
    });
};

export const drawCards = (ctx: EffectContext, playerId: number, count: number, isPhaseDraw: boolean = false) => {
  const finalTargetId = getTargetId(ctx, playerId);

  // Update Quest Progress for "Cups Chariot" (Draw cards)
  if (count > 0) {
      updateQuestProgress(ctx, finalTargetId, 'quest-cups-chariot', count);
  }

  // Field: Pentacles Magician (Shuffle before draw if active)
  ctx.setGameState(prev => {
      if (!prev) return null;
      if (prev.field && prev.field.active && prev.field.card.name.includes('星币·魔术师')) {
          const key = finalTargetId === 1 ? 'player1' : 'player2';
          ctx.log(`[场地] 星币·魔术师激活！${prev[key].name} 抽牌前重洗牌堆。`);
          return {
              ...prev,
              [key]: { ...prev[key], deck: shuffleDeck(prev[key].deck) }
          };
      }
      return prev;
  });

  ctx.setGameState(prev => {
    if (!prev) return null;
    const key = finalTargetId === 1 ? 'player1' : 'player2';
    const p = prev[key];
    
    const foolCards = p.hand.filter(c => c.marks.includes('mark-cups-fool'));
    let actualCount = count;
    if (isPhaseDraw && foolCards.length > 0) {
        actualCount = Math.max(0, count - foolCards.length);
        if (actualCount < count) ctx.log(`[愚者] ${p.name} 因标记减少了抽牌数。`);
    }

    let newDeck = [...p.deck];
    let newHand = [...p.hand];
    const newPendingEffects = [...prev.pendingEffects];
    let drawnCount = 0;
    
    // Check Pentacles Fool Field Active
    let field = prev.field;
    let pendingTransform = false;
    if (field && field.active && field.card.name.includes('星币·愚者')) {
        pendingTransform = true;
        // Reset field immediately
        field = { ...field, active: false, counter: 0 };
        ctx.log(`[场地] 星币·愚者触发！抽到的牌将发生变化。`);
    }

    for(let i=0; i<actualCount; i++) {
      if(newDeck.length > 0) {
        let card = newDeck.shift()!;
        
        // Pentacles Fool Field Transform Logic
        if (pendingTransform && i === 0) {
             const candidates = CARD_DEFINITIONS.filter(c => !c.isTreasure);
             const newDef = candidates[Math.floor(Math.random() * candidates.length)];
             const transformedCard: Card = {
                 ...newDef,
                 instanceId: card.instanceId,
                 marks: card.marks,
                 description: newDef.description || ""
             };
             ctx.log(`[变化] 抽到的 [${card.name}] 变成了 [${transformedCard.name}]！`);
             card = transformedCard;
             pendingTransform = false; 
        }

        // Swords Tower Logic
        if (card.name.includes('宝剑·高塔')) {
            ctx.log(`[宝剑·高塔] 被抽到！传染标记并自我弃置。`);
        }

        newHand.push(card);
        drawnCount++;
        if (card.onDraw) {
           newPendingEffects.push({
             type: 'ON_DRAW',
             card: card,
             playerId: finalTargetId
           });
        }
      }
    }
    
    if (drawnCount > 0) {
      ctx.log(`[抽牌] ${p.name} 抽取了 ${drawnCount} 张牌。`);
    }
    
    return {
      ...prev,
      [key]: { ...p, deck: newDeck, hand: newHand },
      pendingEffects: newPendingEffects,
      field: field 
    };
  });
};

export const addMarkToCard = (card: Card, mark: string): Card => {
  // New Rule: Cards can only hold ONE mark. Newer marks overwrite older ones.
  return { ...card, marks: [mark] };
};

export const shufflePlayerDeck = (ctx: EffectContext, playerId: number) => {
    const finalTargetId = getTargetId(ctx, playerId);
    ctx.setGameState(prev => {
        if (!prev) return null;
        const key = finalTargetId === 1 ? 'player1' : 'player2';
        const p = prev[key];
        ctx.log(`[打乱] ${p.name} 的牌堆被打乱了。`);
        return {
            ...prev,
            [key]: { ...p, deck: shuffleDeck(p.deck) }
        };
    });
};

export const putCardInDeck = (ctx: EffectContext, targetId: number, card: Card, shuffle: boolean = true) => {
    const finalTargetId = getTargetId(ctx, targetId);
    ctx.setGameState(prev => {
        if (!prev) return null;
        const key = finalTargetId === 1 ? 'player1' : 'player2';
        const p = prev[key];
        
        // Treasure safety
        if (card.isTreasure) {
            ctx.log(`[归库] 宝藏牌 [${card.name}] 回到了宝库。`);
            return prev;
        }

        let newDeck = [...p.deck, card];
        if (shuffle) {
            newDeck = shuffleDeck(newDeck);
            ctx.log(`[入库] [${card.name}] 被洗入 ${p.name} 的牌堆。`);
        } else {
            ctx.log(`[入库] [${card.name}] 被置入 ${p.name} 的牌堆底。`);
        }
        
        return {
            ...prev,
            [key]: { ...p, deck: newDeck }
        };
    });
};

export const seizeCard = (ctx: EffectContext, cardInstanceId: string) => {
    ctx.setGameState(prev => {
        if(!prev) return null;
        
        const p1Has = prev.player1.hand.some(c => c.instanceId === cardInstanceId) || prev.player1.fieldSlot?.instanceId === cardInstanceId;
        const ownerId = p1Has ? 1 : 2;
        const targetId = ownerId === 1 ? 2 : 1; 
        
        const ownerKey = ownerId === 1 ? 'player1' : 'player2';
        const targetKey = targetId === 1 ? 'player1' : 'player2';
        
        let cardToSeize: Card | null = null;
        
        const newOwnerHand = prev[ownerKey].hand.filter(c => {
            if(c.instanceId === cardInstanceId) {
                cardToSeize = c;
                return false;
            }
            return true;
        });
        
        let newOwnerField = prev[ownerKey].fieldSlot;
        if(newOwnerField?.instanceId === cardInstanceId) {
            cardToSeize = newOwnerField;
            newOwnerField = null;
        }

        if(!cardToSeize) return prev;
        
        const c = cardToSeize as Card;

        if(c.isTreasure) {
            ctx.log(`[夺取失败] ${c.name} 是【宝藏】牌，无法被夺取！`);
            return prev;
        }

        // Pentacles Emperor Passive: If seized, discard instead
        if(c.name.includes('星币·皇帝')) {
             ctx.log(`[夺取抵抗] ${c.name} 拒绝被夺取，自我放逐！`);
             return {
                 ...prev,
                 [ownerKey]: { 
                     ...prev[ownerKey], 
                     hand: newOwnerHand, 
                     fieldSlot: newOwnerField,
                     discardPile: [...prev[ownerKey].discardPile, c] 
                 }
             };
        }

        ctx.log(`[夺取] 从 ${prev[ownerKey].name} 处夺取了 [${c.name}]！`);

        const visualEvent: VisualEvent = {
            id: `seize-${Date.now()}`,
            type: 'FLY_CARD',
            fromPid: ownerId,
            toPid: targetId,
            cardName: c.name
        };

        return {
            ...prev,
            [ownerKey]: { ...prev[ownerKey], hand: newOwnerHand, fieldSlot: newOwnerField },
            [targetKey]: { ...prev[targetKey], hand: [...prev[targetKey].hand, c] },
            visualEvents: [...prev.visualEvents, visualEvent]
        };
    });
};

export const blindSeize = (ctx: EffectContext, count: number = 1, markToAdd: string | null = null) => {
    const oppId = getOpponentId(ctx.sourcePlayerId);
    
    ctx.setGameState(prev => {
        if(!prev) return null;
        const oppKey = oppId === 1 ? 'player1' : 'player2';
        const myKey = ctx.sourcePlayerId === 1 ? 'player1' : 'player2';
        
        // Filter out safe cards (Treasures, Pentacles Fool Mark)
        const safeCards = prev[oppKey].hand.filter(c => c.isTreasure || c.marks.includes('mark-pentacles-fool'));
        const vulnerableCards = prev[oppKey].hand.filter(c => !c.isTreasure && !c.marks.includes('mark-pentacles-fool'));
        
        let oppHandVulnerable = [...vulnerableCards];
        let myHand = [...prev[myKey].hand];
        let oppDiscard = [...prev[oppKey].discardPile];
        
        // Ensure we don't try to seize more than available
        const actualCount = Math.min(count, oppHandVulnerable.length);
        
        if (actualCount < count) {
            ctx.log(`[盲夺] 目标手牌不足或被保护，只夺取了 ${actualCount} 张。`);
        }

        const newVisualEvents = [...prev.visualEvents];

        for(let i=0; i<actualCount; i++) {
            if(oppHandVulnerable.length === 0) break;
            const randIdx = Math.floor(Math.random() * oppHandVulnerable.length);
            let seized = oppHandVulnerable[randIdx];
            
            oppHandVulnerable.splice(randIdx, 1);
            
            // Pentacles Emperor Passive
            if (seized.name.includes('星币·皇帝')) {
                 ctx.log(`[盲夺抵抗] 抓到了 [${seized.name}]，但它自我放逐了！`);
                 oppDiscard.push(seized);
                 continue; // Do not add to myHand
            }
            
            if (markToAdd) {
                seized = addMarkToCard(seized, markToAdd);
            }
            
            myHand.push(seized);
            ctx.log(`[盲夺] 随机夺取了对手的 [${seized.name}]！`);
            
            newVisualEvents.push({
                id: `blind-seize-${Date.now()}-${i}`,
                type: 'FLY_CARD',
                fromPid: oppId,
                toPid: ctx.sourcePlayerId,
                cardName: '???'
            });
        }
        
        // Recombine opponent hand
        const newOppHand = [...safeCards, ...oppHandVulnerable];

        return {
            ...prev,
            [oppKey]: { ...prev[oppKey], hand: newOppHand, discardPile: oppDiscard },
            [myKey]: { ...prev[myKey], hand: myHand },
            visualEvents: newVisualEvents
        };
    });
};

export const returnCard = (ctx: EffectContext, cardInstanceId: string) => {
    ctx.setGameState(prev => {
        if(!prev) return null;
        const key = ctx.sourcePlayerId === 1 ? 'player1' : 'player2';
        const p = prev[key];
        const card = p.discardPile.find(c => c.instanceId === cardInstanceId);
        if(!card) return prev;
        
        ctx.log(`[归来] 将 [${card.name}] 移回手牌。`);
        
        return {
            ...prev,
            [key]: {
                ...p,
                discardPile: p.discardPile.filter(c => c.instanceId !== cardInstanceId),
                hand: [...p.hand, card]
            }
        };
    });
};

export const destroyCard = (ctx: EffectContext, cardInstanceId: string) => {
    ctx.setGameState(prev => {
        if(!prev) return null;
        const key = ctx.sourcePlayerId === 1 ? 'player1' : 'player2';
        const p = prev[key];
        
        // Check immunity
        let target = p.hand.find(c => c.instanceId === cardInstanceId) 
                     || p.deck.find(c => c.instanceId === cardInstanceId)
                     || p.discardPile.find(c => c.instanceId === cardInstanceId)
                     || (p.fieldSlot?.instanceId === cardInstanceId ? p.fieldSlot : undefined);
        
        if (target && target.isTreasure) {
             ctx.log(`[销毁免疫] 宝藏牌 [${target.name}] 无法被销毁。`);
             return prev;
        }

        const hand = p.hand.filter(c => c.instanceId !== cardInstanceId);
        const deck = p.deck.filter(c => c.instanceId !== cardInstanceId);
        const discardPile = p.discardPile.filter(c => c.instanceId !== cardInstanceId);
        const fieldSlot = p.fieldSlot?.instanceId === cardInstanceId ? null : p.fieldSlot;
        
        ctx.log(`[销毁] 一张卡牌 [${target?.name || '未知'}] 被移出游戏。`);
        
        const visualEvent: VisualEvent = {
            id: `destroy-${Date.now()}`,
            type: 'TRANSFORM_CARD', // Re-using transform effect for destruction puff
            fromPid: ctx.sourcePlayerId,
            cardName: target?.name
        };

        return {
            ...prev,
            [key]: { ...p, hand, deck, discardPile, fieldSlot },
            visualEvents: [...prev.visualEvents, visualEvent]
        };
    });
};

export const lockRandomCard = (ctx: EffectContext, targetId: number, count: number, duration: number = 1) => {
    const finalTargetId = getTargetId(ctx, targetId);
    ctx.setGameState(prev => {
        if (!prev) return null;
        const key = finalTargetId === 1 ? 'player1' : 'player2';
        const p = prev[key];
        
        if (p.hand.length === 0) return prev;

        // Get indices of unlocked cards
        const availableIndices = p.hand
            .map((c, i) => (!c.isLocked && !c.isTreasure) ? i : -1)
            .filter(i => i !== -1);
            
        if (availableIndices.length === 0) {
            ctx.log(`[锁定] ${p.name} 没有可锁定的卡牌。`);
            return prev;
        }

        const indicesToLock: number[] = [];
        for (let i = 0; i < count; i++) {
            if (availableIndices.length === 0) break;
            const r = Math.floor(Math.random() * availableIndices.length);
            indicesToLock.push(availableIndices[r]);
            availableIndices.splice(r, 1);
        }

        // Apply lock with duration
        // Note: duration determines how many 'cleanup' cycles (Discard Phase) the lock persists.
        // A duration of 1 means it will be removed at the NEXT cleanup (usually this turn's end).
        const newHand = p.hand.map((c, i) => indicesToLock.includes(i) ? { ...c, isLocked: true, lockedTurns: duration } : c);
        const lockedCount = indicesToLock.length;
        if (lockedCount > 0) ctx.log(`[锁定] ${p.name} 的 ${lockedCount} 张牌被锁定了 (持续${duration}轮)。`);

        return {
            ...prev,
            [key]: { ...p, hand: newHand }
        };
    });
}

// --- FIELD ACTIONS ---

export const discardField = (ctx: EffectContext) => {
    ctx.setGameState(prev => {
        if (!prev || !prev.field) return prev;
        
        const card = prev.field.card;
        const ownerId = prev.field.ownerId;
        const key = ownerId === 1 ? 'player1' : 'player2';
        
        ctx.log(`[场地] ${card.name} 被弃置/覆盖。`);
        
        if (card.isTreasure) {
             ctx.log(`[归库] 宝藏场地 [${card.name}] 回到了宝库。`);
             return { ...prev, field: null };
        }

        // Revert Buffs if specific cards
        let p = prev[key];
        if (card.name.includes('圣杯·力量')) {
            ctx.log(`[圣杯·力量] 场地失效，攻击力还原。`);
            p = { ...p, atk: p.atk - 1 };
        }

        return {
            ...prev,
            [key]: { ...p, discardPile: [...p.discardPile, card] },
            field: null
        };
    });
};

export const setField = (ctx: EffectContext, card: Card, activateNow: boolean = false) => {
    // First discard existing field if any
    discardField(ctx);

    ctx.setGameState(prev => {
        if (!prev) return null;
        
        // Apply Buffs for new field
        const key = ctx.sourcePlayerId === 1 ? 'player1' : 'player2';
        let p = prev[key];
        
        if (card.name.includes('圣杯·力量')) {
            ctx.log(`[圣杯·力量] 场地激活！攻击力+1。`);
            p = { ...p, atk: p.atk + 1 };
        }

        ctx.log(`[场地] 设置为: ${card.name}`);

        const intermediateState = {
            ...prev,
            [key]: p,
            field: {
                card,
                ownerId: ctx.sourcePlayerId,
                counter: 0,
                active: activateNow // Use parameter to decide activation
            }
        };
        
        return checkPentaclesWheelActivation(intermediateState);
    });
};

// Discard Wrapper with Treasure Protection & Field Logic
export const discardCards = (ctx: EffectContext, playerId: number, cardInstanceIds: string[]) => {
    const finalTargetId = getTargetId(ctx, playerId);
    
    // Check Quest Progress for "Swords Temperance" (Discard cards)
    if (cardInstanceIds.length > 0) {
        updateQuestProgress(ctx, finalTargetId, 'quest-swords-temperance', cardInstanceIds.length);
    }

    ctx.setGameState(prev => {
        if(!prev) return null;
        const key = finalTargetId === 1 ? 'player1' : 'player2';
        const p = prev[key];
        
        // Filter out treasures from being discarded
        const idsToDiscard = cardInstanceIds.filter(id => {
             const c = p.hand.find(x => x.instanceId === id);
             if (c && c.isTreasure) {
                 ctx.log(`[归库] 宝藏牌 [${c.name}] 回到了宝库！`);
                 return false;
             }
             return true;
        });

        const treasuresToRemove = cardInstanceIds.filter(id => {
             const c = p.hand.find(x => x.instanceId === id);
             return c && c.isTreasure;
        });

        const newPending = [...prev.pendingEffects];
        const newHand = p.hand.filter(c => {
            if(treasuresToRemove.includes(c.instanceId)) return false; // Remove treasure from hand (to vault)
            if(idsToDiscard.includes(c.instanceId)) {
                if(c.onDiscard) newPending.push({ type: 'ON_DISCARD', card: c, playerId: finalTargetId, description: "弃置触发！" });
                return false; // Move to discard pile logic
            }
            return true;
        });
        
        const discardedCards = p.hand.filter(c => idsToDiscard.includes(c.instanceId));
        
        let nextState = {
            ...prev,
            pendingEffects: newPending,
            [key]: { ...p, hand: newHand, discardPile: [...p.discardPile, ...discardedCards] }
        };

        // --- FIELD COUNTERS LOGIC ---
        if (nextState.field) {
            // Wands Magician: After 4 discards, recycle discard piles to deck
            if (nextState.field.card.name.includes('权杖·魔术师')) {
                const newCounter = nextState.field.counter + discardedCards.length;
                if (newCounter >= 4) {
                    ctx.log(`[场地] 权杖·魔术师激活！所有弃置牌回收至牌堆！`);
                    // Recycle
                    const recycle = (pl: PlayerState) => ({
                        ...pl,
                        deck: shuffleDeck([...pl.deck, ...pl.discardPile]),
                        discardPile: []
                    });
                    nextState = {
                        ...nextState,
                        player1: recycle(nextState.player1),
                        player2: recycle(nextState.player2),
                        field: { ...nextState.field, counter: newCounter } // Keep counter rising or reset? Assuming continuous.
                    };
                } else {
                    nextState.field = { ...nextState.field, counter: newCounter };
                }
            }
            // Cups Temperance: After 4 discards, discard ALL hands then discard field
            else if (nextState.field.card.name.includes('圣杯·节制')) {
                const newCounter = nextState.field.counter + discardedCards.length;
                if (newCounter >= 4) {
                    ctx.log(`[场地] 圣杯·节制激活！清空手牌并摧毁场地！`);
                    
                    // Move hands to discard
                    const discardHand = (pl: PlayerState) => ({
                        ...pl,
                        hand: [],
                        discardPile: [...pl.discardPile, ...pl.hand.filter(c => !c.isTreasure)]
                    });
                    
                    nextState = {
                        ...nextState,
                        player1: discardHand(nextState.player1),
                        player2: discardHand(nextState.player2),
                        // Explicitly discard the field here manually in state (simpler than calling action recursively)
                        field: null
                    };
                    // Add field card to owner's discard (if not treasure)
                    const fieldOwnerKey = prev.field.ownerId === 1 ? 'player1' : 'player2';
                    const fieldCard = prev.field.card;
                    if(!fieldCard.isTreasure) {
                        nextState[fieldOwnerKey].discardPile.push(fieldCard);
                    } else {
                        ctx.log(`[归库] 宝藏场地 [${fieldCard.name}] 回到了宝库。`);
                    }
                } else {
                    nextState.field = { ...nextState.field, counter: newCounter };
                }
            }
        }

        return nextState;
    });
};

export const checkGameOver = (ctx: EffectContext) => {
    ctx.setGameState(prev => {
        if(!prev) return null;

        // Pentacles Wheel Field Override
        let p1Win = prev.player2.hp <= 0;
        let p2Win = prev.player1.hp <= 0;

        // Ensure active state is correct
        const intermediate = checkPentaclesWheelActivation(prev);

        if (intermediate.field && intermediate.field.active && intermediate.field.card.name.includes('星币·命运之轮')) {
            const owner = intermediate.field.ownerId;
            if (owner === 1) {
                // P1 Victory if P1 HP <= 0 (Self HP <= 0)
                if (intermediate.player1.hp <= 0) p1Win = true;
            } else {
                // P2 Victory if P2 HP <= 0 (Self HP <= 0)
                if (intermediate.player2.hp <= 0) p2Win = true;
            }
        }

        if(p1Win || p2Win) {
            let msg = p1Win && p2Win ? "双方平局！" : p1Win ? "玩家 1 获胜！" : "玩家 2 获胜！";
            return { ...intermediate, phase: 'GAME_OVER' as any, logs: [msg, ...intermediate.logs] };
        }
        return intermediate;
    });
};

// --- QUEST LOGIC ---

export const addQuest = (ctx: EffectContext, playerId: number, quest: Quest) => {
    const finalTargetId = getTargetId(ctx, playerId);
    ctx.setGameState(prev => {
        if (!prev) return null;
        const key = finalTargetId === 1 ? 'player1' : 'player2';
        const p = prev[key];
        
        if (p.quests.length >= 2) {
            ctx.log(`[任务] ${p.name} 的任务栏已满，无法接受任务：${quest.name}。`);
            return prev;
        }
        
        if (p.quests.some(q => q.id === quest.id)) {
             ctx.log(`[任务] ${p.name} 已经拥有任务：${quest.name}。`);
             return prev;
        }

        ctx.log(`[任务] ${p.name} 获得了任务：${quest.name}。`);
        return {
            ...prev,
            [key]: { ...p, quests: [...p.quests, quest] }
        };
    });
};

export const updateQuestProgress = (ctx: EffectContext, playerId: number, questId: string, amount: number) => {
    ctx.setGameState(prev => {
        if (!prev) return null;
        const key = playerId === 1 ? 'player1' : 'player2';
        const p = prev[key];
        
        const questIdx = p.quests.findIndex(q => q.id === questId);
        if (questIdx === -1) return prev;
        
        const quest = p.quests[questIdx];
        const newProgress = quest.progress + amount;
        
        if (newProgress >= quest.target) {
            // COMPLETE
            ctx.log(`[任务完成] ${p.name} 完成了任务：${quest.name}！`);
            
            // Handle Rewards Logic Here
            let updatedPlayer = { ...p };
            let interaction = prev.interaction;
            
            if (questId === 'quest-swords-temperance') {
                ctx.log(`[奖励] 手牌上限 +1。`);
                updatedPlayer.maxHandSize += 1;
            } else if (questId === 'quest-cups-chariot') {
                const dmg = p.atk;
                ctx.log(`[奖励] 对对手造成 ${dmg} 点伤害。`);
                setTimeout(() => damagePlayer(ctx, getOpponentId(playerId), dmg), 100);
            } else if (questId === 'quest-wands-star') {
                // Interaction reward
                 setTimeout(() => {
                     ctx.setGameState(curr => {
                         if (!curr) return null;
                         return {
                             ...curr,
                             interaction: {
                                 id: `quest-wands-star-reward-${Date.now()}`,
                                 playerId: playerId,
                                 title: "任务奖励：权杖·星星",
                                 description: "选择一张牌置入手牌：",
                                 options: [
                                     { label: "☀️ 太阳", action: () => giveCardReward(ctx, playerId, '太阳') },
                                     { label: "🌙 月亮", action: () => giveCardReward(ctx, playerId, '月亮') },
                                     { label: "⭐ 星星", action: () => giveCardReward(ctx, playerId, '星星') },
                                 ]
                             }
                         }
                     });
                 }, 200);
            } else if (questId === 'quest-swords-sun') {
                 setTimeout(() => {
                     ctx.setGameState(curr => {
                         if (!curr) return null;
                         const currentP = playerId === 1 ? curr.player1 : curr.player2;
                         const mult = currentP.swordsSunDamageMult || 1;
                         const dmg = currentP.atk * 2 * mult;
                         
                         return {
                             ...curr,
                             interaction: {
                                 id: `quest-swords-sun-reward-${Date.now()}`,
                                 playerId: playerId,
                                 title: "任务奖励：宝剑·太阳",
                                 description: `选择奖励 (当前伤害倍率: ${mult}x)`,
                                 options: [
                                     { 
                                         label: `造成 ${dmg} 点伤害`, 
                                         action: () => {
                                             damagePlayer(ctx, getOpponentId(playerId), dmg);
                                             modifyPlayer(ctx, playerId, pl => ({ ...pl, swordsSunDamageMult: 1 }));
                                             ctx.setGameState(s => s ? ({ ...s, interaction: null }) : null);
                                         }
                                     },
                                     { 
                                         label: "再接任务 (伤害翻倍)", 
                                         action: () => {
                                             modifyPlayer(ctx, playerId, pl => ({ ...pl, swordsSunDamageMult: mult * 2 }));
                                             addQuest(ctx, playerId, {
                                                id: 'quest-swords-sun',
                                                name: '宝剑·太阳',
                                                description: '打出 太阳',
                                                progress: 0,
                                                target: 1
                                             });
                                             ctx.setGameState(s => s ? ({ ...s, interaction: null }) : null);
                                         }
                                     }
                                 ]
                             }
                         }
                     });
                 }, 200);
            } else if (questId === 'quest-swords-world') {
                 // Swords World Reward: Pick a treasure
                 setTimeout(() => {
                     ctx.setGameState(curr => {
                         if (!curr) return null;
                         return {
                             ...curr,
                             interaction: {
                                 id: `quest-swords-world-reward-${Date.now()}`,
                                 playerId: playerId,
                                 title: "任务奖励：宝剑·世界",
                                 description: "指定一张宝库中存在的宝藏牌，并获取之：",
                                 options: [
                                     { label: "💎 宝剑", action: () => giveCardReward(ctx, playerId, 'treasure-swords', true) },
                                     { label: "💎 圣杯", action: () => giveCardReward(ctx, playerId, 'treasure-cups', true) },
                                     { label: "💎 权杖", action: () => giveCardReward(ctx, playerId, 'treasure-wands', true) }
                                 ]
                             }
                         }
                     });
                 }, 200);
            } else if (questId === 'quest-pentacles-fool') {
                 // Pentacles Fool Reward
                 setTimeout(() => {
                     ctx.setGameState(curr => {
                         if (!curr) return null;
                         return {
                             ...curr,
                             interaction: {
                                 id: `quest-pentacles-fool-reward-${Date.now()}`,
                                 playerId: playerId,
                                 title: "任务奖励：星币·愚者",
                                 description: "选择一种奖励:",
                                 options: [
                                     { 
                                         label: "变化所有手牌", 
                                         action: () => {
                                            // Transform All
                                            const p = curr[playerId === 1 ? 'player1' : 'player2'];
                                            p.hand.forEach(c => transformCard(ctx, playerId, c.instanceId));
                                            ctx.setGameState(s => s ? ({...s, interaction: null}) : null);
                                         } 
                                     },
                                     { 
                                         label: "打乱牌堆并抽1张", 
                                         action: () => {
                                             shufflePlayerDeck(ctx, playerId);
                                             setTimeout(() => drawCards(ctx, playerId, 1), 100);
                                             ctx.setGameState(s => s ? ({...s, interaction: null}) : null);
                                         } 
                                     }
                                 ]
                             }
                         }
                     });
                 }, 200);
            } else if (questId === 'quest-pentacles-priestess') {
                // Pentacles Priestess Reward: Scry 5, move 1 to bottom
                setTimeout(() => {
                    ctx.setGameState(curr => {
                        if(!curr) return null;
                        const key = playerId === 1 ? 'player1' : 'player2';
                        const deck = curr[key].deck;
                        if(deck.length === 0) return curr;
                        
                        const toScry = deck.slice(0, 5);
                        
                        return {
                            ...curr,
                            interaction: {
                                id: `quest-pentacles-priestess-reward-${Date.now()}`,
                                playerId: playerId,
                                title: "任务奖励：星币·女祭司",
                                description: `占卜结果: ${toScry.map(c=>c.name).join(', ')}。选择任意张移至牌堆底，其余保留原位:`,
                                inputType: 'CARD_SELECT',
                                cardsToSelect: toScry,
                                options: [{label: "不移动", action: () => ctx.setGameState(s=>s?({...s, interaction:null}):null)}],
                                onCardSelect: (c) => {
                                    modifyPlayer(ctx, playerId, pl => ({
                                        ...pl,
                                        deck: [...pl.deck.filter(dc => dc.instanceId !== c.instanceId), c]
                                    }));
                                    ctx.log(`[星币·女祭司] 将 [${c.name}] 移到了牌堆底。`);
                                    // Usually scry allows multiple, but simplified to picking 1 or repeating.
                                    // For simplicity, pick 1 closes dialog.
                                    ctx.setGameState(s=>s?({...s, interaction:null}):null);
                                }
                            }
                        }
                    });
                }, 200);
            }

            return {
                ...prev,
                [key]: { ...updatedPlayer, quests: p.quests.filter(q => q.id !== questId) },
                interaction: interaction
            };
        }
        
        // Update Progress
        const newQuests = [...p.quests];
        newQuests[questIdx] = { ...quest, progress: newProgress };
        
        return {
            ...prev,
            [key]: { ...p, quests: newQuests }
        };
    });
};

const giveCardReward = (ctx: EffectContext, playerId: number, identifier: string, isIdMatch: boolean = false) => {
    // If isIdMatch is true, we look for exact ID match (e.g. treasure-cups)
    // If false, we look for name inclusion (e.g. '太阳')
    const def = CARD_DEFINITIONS.find(c => isIdMatch ? c.id === identifier : c.name.includes(identifier));
    
    if (def) {
        const newCard = { ...def, instanceId: `reward-${Date.now()}`, marks: [], description: def.description || "" };
        modifyPlayer(ctx, playerId, p => ({ ...p, hand: [...p.hand, newCard] }));
        ctx.log(`[获取] 获得了 [${def.name}]！`);
        ctx.setGameState((s:any) => s ? ({...s, interaction: null}) : null);
    } else {
        console.warn(`Card reward not found: ${identifier}`);
        ctx.setGameState((s:any) => s ? ({...s, interaction: null}) : null);
    }
};

export const clash = (ctx: EffectContext, onResolve: (ctx: EffectContext, result: 'WIN' | 'LOSE' | 'TIE', myCard: Card, oppCard: Card) => void) => {
    // 1. Peek top cards (Remove from deck)
    let p1Card: Card | null = null;
    let p2Card: Card | null = null;
    
    ctx.setGameState(prev => {
        if(!prev) return null;
        const p1 = prev.player1;
        const p2 = prev.player2;
        if(p1.deck.length === 0 || p2.deck.length === 0) {
            ctx.log("拼点失败：牌堆不足。");
            return prev;
        }
        p1Card = p1.deck[0];
        p2Card = p2.deck[0];
        
        return {
            ...prev,
            player1: { ...p1, deck: p1.deck.slice(1) },
            player2: { ...p2, deck: p2.deck.slice(1) }
        };
    });

    // 2. Resolve logic next tick to ensure state updated
    setTimeout(() => {
        if(!p1Card || !p2Card) return;
        
        const n1 = getArcanaNumber(p1Card);
        const n2 = getArcanaNumber(p2Card);
        
        ctx.log(`拼点: P1[${p1Card.name}(${n1})] vs P2[${p2Card.name}(${n2})]`);
        
        let p1Res: 'WIN' | 'LOSE' | 'TIE' = 'TIE';
        if (n1 > n2) p1Res = 'WIN';
        else if (n1 < n2) p1Res = 'LOSE';
        
        const p2Res = p1Res === 'WIN' ? 'LOSE' : p1Res === 'LOSE' ? 'WIN' : 'TIE';

        // Call callback to let specific card decide logic
        const myId = ctx.sourcePlayerId;
        const myCard = myId === 1 ? p1Card : p2Card;
        const oppCard = myId === 1 ? p2Card : p1Card;
        const myResult = myId === 1 ? p1Res : p2Res;
        
        onResolve(ctx, myResult, myCard, oppCard);
        
    }, 200);
};