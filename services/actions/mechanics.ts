
import { EffectContext, Card, VisualEvent } from '../../types';
import { getOpponentId, addMarkToCard } from './utils';
import { updateQuestProgress } from './quests';
import { getArcanaNumber } from '../gameUtils';

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

export const transformCard = (ctx: EffectContext, targetPlayerId: number, cardInstanceId: string) => {
    // Break Cycle: Use context-injected allCards, or fallback (if local dev without context fix, but we fixed it)
    const candidates = ctx.allCards?.filter(c => !c.isTreasure) || [];

    if (candidates.length === 0) {
        console.warn("Transform failed: No card definitions found in context.");
        return;
    }

    ctx.setGameState(prev => {
        if(!prev) return null;
        const key = targetPlayerId === 1 ? 'player1' : 'player2';
        const p = prev[key];
        
        // CHECK PREVENT TRANSFORM (Pentacles Hanged Man)
        if (p.preventTransform > 0) {
            ctx.log(`[变化抵抗] ${p.name} 的“倒吊人”效果阻止了变化！(剩余 ${p.preventTransform-1} 次)`);
            return {
                ...prev,
                [key]: { ...p, preventTransform: p.preventTransform - 1 }
            };
        }
        
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

        // Formatting Log:
        // Field cards are public. Hand cards are private in Online mode.
        // If Online Mode and NOT Field, use {{}} to hide from opponent.
        const isOnline = ctx.gameMode === 'ONLINE';
        const sourceNameLog = isField ? `[${targetCard.name}]` : (isOnline ? `{{${targetCard.name}}}` : `[${targetCard.name}]`);
        const newNameLog = isField ? `[${newCard.name}]` : (isOnline ? `{{${newCard.name}}}` : `[${newCard.name}]`);

        ctx.log(`[变化] ${p.name} 的 ${sourceNameLog} 变成了 ${newNameLog}！`);

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
