

import { EffectContext, PlayerState, GameState, Card, CardSuit } from '../types';
import { shuffleDeck } from './gameUtils';

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
    const newState = mod(currentState);

    // Rule: Prevent Healing if flag is set
    if (currentState.preventHealing && newState.hp > currentState.hp) {
        ctx.log(`[禁疗] ${currentState.name} 无法恢复生命！`);
        newState.hp = currentState.hp;
    }
    
    return {
      ...prev,
      [key]: newState
    };
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
  const sourceId = finalTargetId === 1 ? 2 : 1; // Who dealt it? (Assuming direct opposition for now)

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

    // Apply Changes
    const newSourceHp = source.hp + (source.preventHealing ? 0 : sourceHeal) - sourceSelfDmg;

    return {
      ...prev,
      [key]: { ...p, hp: newHp, nextDamageDouble },
      [sourceKey]: { ...source, hp: newSourceHp }
    };
  });
};

export const drawCards = (ctx: EffectContext, playerId: number, count: number, isPhaseDraw: boolean = false) => {
  const finalTargetId = getTargetId(ctx, playerId);

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

    const newDeck = [...p.deck];
    const newHand = [...p.hand];
    const newPendingEffects = [...prev.pendingEffects];
    let drawnCount = 0;
    
    for(let i=0; i<actualCount; i++) {
      if(newDeck.length > 0) {
        const card = newDeck.shift()!;
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
      pendingEffects: newPendingEffects
    };
  });
};

export const addMarkToCard = (card: Card, mark: string): Card => {
  if (card.marks.includes(mark)) return card;
  return { ...card, marks: [...card.marks, mark] };
};

// --- New Mechanics ---

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

// Moves a specific card (likely from discard/hand) into the target deck and shuffles
export const putCardInDeck = (ctx: EffectContext, targetId: number, card: Card, shuffle: boolean = true) => {
    const finalTargetId = getTargetId(ctx, targetId);
    ctx.setGameState(prev => {
        if (!prev) return null;
        const key = finalTargetId === 1 ? 'player1' : 'player2';
        const p = prev[key];
        
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
        if((cardToSeize as Card).isTreasure) {
            ctx.log(`[夺取失败] ${cardToSeize.name} 是【宝藏】牌，无法被夺取！`);
            return prev;
        }

        ctx.log(`[夺取] 从 ${prev[ownerKey].name} 处夺取了 [${cardToSeize.name}]！`);

        return {
            ...prev,
            [ownerKey]: { ...prev[ownerKey], hand: newOwnerHand, fieldSlot: newOwnerField },
            [targetKey]: { ...prev[targetKey], hand: [...prev[targetKey].hand, cardToSeize] }
        };
    });
};

export const blindSeize = (ctx: EffectContext, count: number = 1) => {
    const oppId = getOpponentId(ctx.sourcePlayerId);
    
    ctx.setGameState(prev => {
        if(!prev) return null;
        const oppKey = oppId === 1 ? 'player1' : 'player2';
        const myKey = ctx.sourcePlayerId === 1 ? 'player1' : 'player2';
        
        let oppHand = [...prev[oppKey].hand];
        let myHand = [...prev[myKey].hand];
        
        for(let i=0; i<count; i++) {
            if(oppHand.length === 0) break;
            const randIdx = Math.floor(Math.random() * oppHand.length);
            const seized = oppHand[randIdx];
            
            if(!seized.isTreasure) {
                oppHand.splice(randIdx, 1);
                myHand.push(seized);
                ctx.log(`[盲夺] 随机夺取了对手的 [${seized.name}]！`);
            } else {
                ctx.log(`[盲夺] 随机选中了【宝藏】，但无法夺取！`);
            }
        }
        
        return {
            ...prev,
            [oppKey]: { ...prev[oppKey], hand: oppHand },
            [myKey]: { ...prev[myKey], hand: myHand }
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
        
        const hand = p.hand.filter(c => c.instanceId !== cardInstanceId);
        const deck = p.deck.filter(c => c.instanceId !== cardInstanceId);
        const discardPile = p.discardPile.filter(c => c.instanceId !== cardInstanceId);
        const fieldSlot = p.fieldSlot?.instanceId === cardInstanceId ? null : p.fieldSlot;
        
        ctx.log(`[销毁] 一张卡牌被移出游戏。`);
        
        return {
            ...prev,
            [key]: { ...p, hand, deck, discardPile, fieldSlot }
        };
    });
};

// Discard Wrapper with Treasure Protection
export const discardCards = (ctx: EffectContext, playerId: number, cardInstanceIds: string[]) => {
    ctx.setGameState(prev => {
        if(!prev) return null;
        const key = playerId === 1 ? 'player1' : 'player2';
        const p = prev[key];
        
        // Filter out treasures from being discarded
        const idsToDiscard = cardInstanceIds.filter(id => {
             const c = p.hand.find(x => x.instanceId === id);
             if (c && c.isTreasure) {
                 ctx.log(`[规则] 宝藏牌 [${c.name}] 无法被弃置！`);
                 return false;
             }
             return true;
        });

        const newPending = [...prev.pendingEffects];
        const newHand = p.hand.filter(c => {
            if(idsToDiscard.includes(c.instanceId)) {
                if(c.onDiscard) newPending.push({ type: 'ON_DISCARD', card: c, playerId, description: "弃置触发！" });
                return false;
            }
            return true;
        });
        
        const discardedCards = p.hand.filter(c => idsToDiscard.includes(c.instanceId));
        
        return {
            ...prev,
            pendingEffects: newPending,
            [key]: { ...p, hand: newHand, discardPile: [...p.discardPile, ...discardedCards] }
        };
    });
};