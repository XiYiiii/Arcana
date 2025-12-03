
import { EffectContext, Quest } from '../../types';
import { getTargetId, getOpponentId, isTreasureInVault, addMarkToCard } from './utils';
import { modifyPlayer } from './core';
import { damagePlayer } from './combat';
import { drawCards, shufflePlayerDeck } from './piles';
import { transformCard } from './mechanics';
import { CARD_DEFINITIONS } from '../../data/cards';

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

export const giveCardReward = (ctx: EffectContext, playerId: number, identifier: string, isIdMatch: boolean = false) => {
    const def = CARD_DEFINITIONS.find(c => isIdMatch ? c.id === identifier : c.name.includes(identifier));
    
    if (def) {
        // Treasure Availability Check
        if (def.isTreasure && isTreasureInVault(ctx.gameState, def.id)) {
             ctx.log(`[获取失败] ${def.name} 已在游戏中，宝库为空！`);
             ctx.setGameState((s:any) => s ? ({...s, interaction: null}) : null);
             return;
        }

        const newCard = { ...def, instanceId: `reward-${Date.now()}`, marks: [], description: def.description || "" };
        modifyPlayer(ctx, playerId, p => ({ ...p, hand: [...p.hand, newCard] }));
        ctx.log(`[获取] 获得了 [${def.name}]！`);
        ctx.setGameState((s:any) => s ? ({...s, interaction: null}) : null);
    } else {
        console.warn(`Card reward not found: ${identifier}`);
        ctx.setGameState((s:any) => s ? ({...s, interaction: null}) : null);
    }
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
                                    ctx.setGameState(s=>s?({...s, interaction:null}):null);
                                }
                            }
                        }
                    });
                }, 200);
            } else if (questId === 'quest-pentacles-moon') {
                // Pentacles Moon Reward: Mark all hand with mark-pentacles-moon
                 setTimeout(() => {
                     ctx.log(`[奖励] 所有手牌获得【星币·月亮】印记。`);
                     modifyPlayer(ctx, playerId, p => ({
                         ...p,
                         hand: p.hand.map(c => addMarkToCard(c, 'mark-pentacles-moon'))
                     }));
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
