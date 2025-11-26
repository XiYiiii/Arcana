


import { CardDefinition, CardSuit } from '../../../types';
import { modifyPlayer, getOpponentId } from '../../../services/actions';

export const SWORDS_MOON: CardDefinition = {
    id: 'swords-moon', name: '宝剑·月亮', suit: CardSuit.SWORDS, rank: 318,
    description: "打出：选择：将当前场地的激活效果撤销，或激活当前场地。\n弃置：若当前场地的所有者为对方，改为己方；否则改为对方。",
    keywords: [],
    onReveal: (ctx) => {
        if (!ctx.gameState.field) {
            ctx.log("当前无场地，【月亮】效果无效。");
            return;
        }

        ctx.setGameState(prev => ({
            ...prev!,
            interaction: {
                id: `swords-moon-toggle-${Date.now()}`,
                playerId: ctx.sourcePlayerId,
                title: "宝剑·月亮",
                description: `当前场地 [${prev!.field!.card.name}] 状态: ${prev!.field!.active ? '激活' : '撤销'}。请选择:`,
                options: [
                    { 
                        label: "撤销 (Deactivate)", 
                        action: () => {
                            ctx.setGameState(s => s ? ({ ...s, field: s.field ? { ...s.field, active: false } : null, interaction: null }) : null);
                            ctx.log("场地效果已撤销。");
                        } 
                    },
                    { 
                        label: "激活 (Activate)", 
                        action: () => {
                            ctx.setGameState(s => s ? ({ ...s, field: s.field ? { ...s.field, active: true } : null, interaction: null }) : null);
                            ctx.log("场地效果已激活。");
                        } 
                    }
                ]
            }
        }));
    },
    onDiscard: (ctx) => {
        ctx.setGameState(prev => {
            if (!prev || !prev.field) return prev;
            
            const currentOwner = prev.field.ownerId;
            const oppId = getOpponentId(ctx.sourcePlayerId);
            const myId = ctx.sourcePlayerId;
            
            // "If owner is opponent, change to self; otherwise change to opponent."
            // Assuming this refers to the perspective of the player discarding the card.
            // If field.ownerId == oppId -> set to myId
            // else -> set to oppId
            
            const newOwner = currentOwner === oppId ? myId : oppId;
            
            ctx.log(`【月亮】流转！场地所有权变更为 P${newOwner}。`);
            
            return {
                ...prev,
                field: { ...prev.field, ownerId: newOwner }
            };
        });
    }
};