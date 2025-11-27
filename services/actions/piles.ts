
import { EffectContext, Card, PlayerState, VisualEvent, CardDefinition } from '../../types';
import { getTargetId } from './utils';
import { updateQuestProgress } from './quests';
import { damagePlayer } from './combat';
import { shuffleDeck } from '../gameUtils';
import { CARD_DEFINITIONS } from '../../data/cards';

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

export const discardCards = (ctx: EffectContext, playerId: number, cardInstanceIds: string[]) => {
    const finalTargetId = getTargetId(ctx, playerId);
    
    // Check Quest Progress for "Swords Temperance" (Discard cards) - Self Check
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

        // Check for Mark Swords Hierophant discard trigger (Global Check)
        discardedCards.forEach(c => {
             if (c.marks.includes('mark-swords-hierophant')) {
                 // Use timeout to break state update cycle and ensure log order
                 setTimeout(() => {
                     ctx.log(`[宝剑·教皇] 标记触发 (弃置)！${p.name} 受到 ${p.atk} 点伤害。`);
                     damagePlayer(ctx, finalTargetId, p.atk);
                 }, 100);
             }
        });
        
        let nextState = {
            ...prev,
            pendingEffects: newPending,
            [key]: { ...p, hand: newHand, discardPile: [...p.discardPile, ...discardedCards] }
        };

        // --- FIELD COUNTERS LOGIC ---
        if (nextState.field) {
            // Cups Temperance: After 4 discards (GLOBAL), discard ALL hands then discard field
            if (nextState.field.card.name.includes('圣杯·节制')) {
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
        const newHand = p.hand.map((c, i) => indicesToLock.includes(i) ? { ...c, isLocked: true, lockedTurns: duration } : c);
        const lockedCount = indicesToLock.length;
        if (lockedCount > 0) ctx.log(`[锁定] ${p.name} 的 ${lockedCount} 张牌被锁定了 (持续${duration}轮)。`);

        return {
            ...prev,
            [key]: { ...p, hand: newHand }
        };
    });
}
