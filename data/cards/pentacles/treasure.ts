

import { CardDefinition, CardSuit, Keyword, Card } from '../../../types';
import { modifyPlayer, addMarkToCard, updateQuestProgress, setField, addQuest } from '../../../services/actions';
import { CARD_DEFINITIONS } from '../../cards';

export const TREASURE_PENTACLES: CardDefinition = {
  id: 'treasure-pentacles', name: '宝藏·星币', suit: CardSuit.TREASURE, rank: 54,
  keywords: [Keyword.IMPRINT, Keyword.QUEST, Keyword.FIELD, Keyword.TREASURE],
  isTreasure: true, canSet: true,
  onReveal: (ctx) => {
      // Logic: Choose 3 times from 3 options.
      startTreasureLoop(ctx, 3);
  }
};

const startTreasureLoop = (ctx: any, remaining: number) => {
    if (remaining <= 0) {
        ctx.setGameState((prev: any) => prev ? ({ ...prev, interaction: null }) : null);
        return;
    }

    ctx.setGameState((prev: any) => {
        if (!prev) return null;
        const p = prev[ctx.sourcePlayerId===1?'player1':'player2'];
        const isQuestFull = p.quests.length >= 2;

        return {
            ...prev,
            interaction: {
                id: `treasure-pentacles-choice-${Date.now()}-${remaining}`,
                playerId: ctx.sourcePlayerId,
                title: `宝藏·星币 (${4 - remaining}/3)`,
                description: "选择一项赐福:",
                options: [
                    { 
                        label: "赋予标记", 
                        action: () => chooseMark(ctx, remaining)
                    },
                    { 
                        label: isQuestFull ? "完成任务 (已满)" : "完成任务", 
                        action: () => {
                            if (isQuestFull) {
                                ctx.log("任务栏已满，无法开启新任务。");
                                // Refresh loop to show log
                                startTreasureLoop(ctx, remaining);
                            } else {
                                chooseNewQuest(ctx, remaining);
                            }
                        }
                    },
                    { 
                        label: "设置场地", 
                        action: () => chooseField(ctx, remaining)
                    }
                ]
            }
        };
    });
};

const chooseMark = (ctx: any, remaining: number) => {
    ctx.setGameState((prev: any) => {
        if(!prev) return null;
        const p = prev[ctx.sourcePlayerId===1?'player1':'player2'];
        return {
            ...prev,
            interaction: {
                id: `treasure-mark-card-${Date.now()}`,
                playerId: ctx.sourcePlayerId,
                title: "选择一张牌赋予标记",
                description: "选择目标卡牌:",
                inputType: 'CARD_SELECT',
                cardsToSelect: p.hand,
                options: [{ label: "返回", action: () => startTreasureLoop(ctx, remaining) }],
                onCardSelect: (c: Card) => {
                     // Helper to get card def for hover
                     const getHoverCard = (id: string) => {
                        const def = CARD_DEFINITIONS.find(c => c.id === id);
                        return def ? { ...def, instanceId: 'preview', marks: [], description: def.description || "" } : undefined;
                     };

                     // Choose mark type
                     ctx.setGameState((s: any) => ({
                         ...s,
                         interaction: {
                             id: `treasure-mark-type-${Date.now()}`,
                             playerId: ctx.sourcePlayerId,
                             title: "选择标记类型",
                             description: `目标: [${c.name}]\n选择要赋予的标记效果 (悬停查看详情):`,
                             options: [
                                 { 
                                     label: "死神 (销毁)", 
                                     action: () => applyMark(ctx, c.instanceId, 'mark-death', remaining),
                                     hoverCard: getHoverCard('pentacles-death') 
                                 },
                                 { 
                                     label: "愚者 (负面)", 
                                     action: () => applyMark(ctx, c.instanceId, 'mark-cups-fool', remaining),
                                     hoverCard: getHoverCard('cups-fool') 
                                 },
                                 { 
                                     label: "魔术师 (双倍)", 
                                     action: () => applyMark(ctx, c.instanceId, 'mark-cups-magician', remaining),
                                     hoverCard: getHoverCard('cups-magician')
                                 },
                                 { 
                                     label: "恋人 (自伤)", 
                                     action: () => applyMark(ctx, c.instanceId, 'mark-swords-lovers', remaining),
                                     hoverCard: getHoverCard('swords-lovers')
                                 },
                                 { 
                                     label: "教皇 (抽牌)", 
                                     action: () => applyMark(ctx, c.instanceId, 'mark-pentacles-hierophant', remaining),
                                     hoverCard: getHoverCard('pentacles-hierophant')
                                 },
                                 { 
                                     label: "返回", 
                                     action: () => chooseMark(ctx, remaining) 
                                 }
                             ]
                         }
                     }));
                }
            }
        }
    });
};

const applyMark = (ctx: any, cardId: string, mark: string, remaining: number) => {
    modifyPlayer(ctx, ctx.sourcePlayerId, p => ({
        ...p,
        hand: p.hand.map(c => c.instanceId === cardId ? addMarkToCard(c, mark) : c)
    }));
    ctx.log(`[宝藏·星币] 赋予了标记。`);
    setTimeout(() => startTreasureLoop(ctx, remaining - 1), 100);
};

const chooseNewQuest = (ctx: any, remaining: number) => {
    const availableQuests = [
        { id: 'quest-cups-chariot', name: '圣杯·战车', description: '抽 10 张牌', target: 10 },
        { id: 'quest-wands-star', name: '权杖·星星', description: '集齐日月', target: 1 },
        { id: 'quest-swords-temperance', name: '宝剑·节制', description: '弃置 8 张牌', target: 8 },
        { id: 'quest-swords-sun', name: '宝剑·太阳', description: '打出 太阳', target: 1 },
        { id: 'quest-swords-world', name: '宝剑·世界', description: '造成 10 点伤害', target: 10 },
        { id: 'quest-pentacles-fool', name: '星币·愚者', description: '变化 3 张牌', target: 3 },
        { id: 'quest-pentacles-priestess', name: '星币·女祭司', description: '承受 10 点伤害', target: 10 },
        { id: 'quest-pentacles-moon', name: '星币·月亮', description: '打出 3 张标记牌', target: 3 },
    ];

    ctx.setGameState((prev: any) => {
        return {
            ...prev,
            interaction: {
                id: `treasure-quest-${Date.now()}`,
                playerId: ctx.sourcePlayerId,
                title: "开启并完成任务",
                description: "选择一个任务，立即开启并完成它 (悬停查看对应卡牌):",
                options: [
                    ...availableQuests.map((q) => {
                        // Resolve hover card from quest id
                        const cardId = q.id.replace('quest-', '');
                        const cardDef = CARD_DEFINITIONS.find(c => c.id === cardId);
                        const hoverCard = cardDef ? { ...cardDef, instanceId: 'preview-quest', marks: [], description: cardDef.description || "" } : undefined;

                        return {
                            label: `${q.name}`,
                            action: () => {
                                // 1. Add Quest
                                addQuest(ctx, ctx.sourcePlayerId, {
                                    id: q.id,
                                    name: q.name,
                                    description: q.description,
                                    progress: 0,
                                    target: q.target
                                });
                                
                                // 2. Complete Quest immediately
                                setTimeout(() => {
                                    ctx.log(`[宝藏·星币] 瞬间完成了任务 [${q.name}]！`);
                                    updateQuestProgress(ctx, ctx.sourcePlayerId, q.id, 999); 
                                    setTimeout(() => startTreasureLoop(ctx, remaining - 1), 200);
                                }, 100);
                                
                                ctx.setGameState((s:any) => s ? ({...s, interaction: null}) : null);
                            },
                            hoverCard
                        };
                    }),
                    { label: "返回", action: () => startTreasureLoop(ctx, remaining) }
                ]
            }
        };
    });
};

const chooseField = (ctx: any, remaining: number) => {
     const fields = CARD_DEFINITIONS.filter(c => c.keywords?.includes(Keyword.FIELD) && !c.isTreasure);
     
     // Select interesting fields
     const targetNames = ['圣杯·力量', '圣杯·节制', '权杖·魔术师', '宝剑·死神', '宝剑·星星', '星币·愚者', '星币·魔术师', '星币·命运之轮'];
     const keyFields = fields.filter(c => targetNames.some(name => c.name.includes(name)));

     ctx.setGameState((prev: any) => ({
         ...prev,
         interaction: {
             id: `treasure-field-${Date.now()}`,
             playerId: ctx.sourcePlayerId,
             title: "选择场地设置",
             description: "选择一个场地 (悬停查看详情):",
             options: [
                 ...keyFields.map(f => ({
                    label: f.name,
                    action: () => {
                        const fieldCard = { ...f, instanceId: `field-${Date.now()}`, marks: [], description: f.description || "" };
                        setField(ctx, fieldCard, true);
                        setTimeout(() => startTreasureLoop(ctx, remaining - 1), 100);
                    },
                    hoverCard: { ...f, instanceId: 'preview', marks: [], description: f.description || "" }
                 })),
                 { label: "返回", action: () => startTreasureLoop(ctx, remaining) }
             ]
         }
     }));
};