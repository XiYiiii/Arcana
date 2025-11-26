
import { CardDefinition, CardSuit } from '../../../types';
import { modifyPlayer, updateQuestProgress, getOpponentId } from '../../../services/actions';

export const PENTACLES_EMPRESS: CardDefinition = {
    id: 'pentacles-empress', name: '星币·女皇', suit: CardSuit.PENTACLES, rank: 403,
    description: "打出：指定一个己方任务，并完成它。\n弃置：指定一个对方任务，将其任务进度归零。",
    keywords: [],
    onReveal: (ctx) => {
        ctx.setGameState(prev => {
            if(!prev) return null;
            const key = ctx.sourcePlayerId === 1 ? 'player1' : 'player2';
            const quests = prev[key].quests;
            
            if (quests.length === 0) {
                ctx.log("己方无任务可完成。");
                return prev;
            }

            return {
                ...prev,
                interaction: {
                    id: `pentacles-empress-complete-${Date.now()}`,
                    playerId: ctx.sourcePlayerId,
                    title: "星币·女皇",
                    description: "选择一个任务立即完成:",
                    options: quests.map(q => ({
                        label: `${q.name} (${q.progress}/${q.target})`,
                        action: () => {
                            // Instant complete
                            updateQuestProgress(ctx, ctx.sourcePlayerId, q.id, q.target);
                            ctx.setGameState(s => s ? ({...s, interaction: null}) : null);
                        }
                    }))
                }
            };
        });
    },
    onDiscard: (ctx) => {
        ctx.setGameState(prev => {
            if(!prev) return null;
            const oppId = getOpponentId(ctx.sourcePlayerId);
            const key = oppId === 1 ? 'player1' : 'player2';
            const quests = prev[key].quests;
            
            if (quests.length === 0) {
                ctx.log("对方无任务。");
                return prev;
            }

            return {
                ...prev,
                interaction: {
                    id: `pentacles-empress-reset-${Date.now()}`,
                    playerId: ctx.sourcePlayerId,
                    title: "星币·女皇",
                    description: "选择一个对方任务将其归零:",
                    options: quests.map(q => ({
                        label: `${q.name}`,
                        action: () => {
                            modifyPlayer(ctx, oppId, p => ({
                                ...p,
                                quests: p.quests.map(tq => tq.id === q.id ? { ...tq, progress: 0 } : tq)
                            }));
                            ctx.log(`【星币·女皇】将任务 [${q.name}] 进度归零！`);
                            ctx.setGameState(s => s ? ({...s, interaction: null}) : null);
                        }
                    }))
                }
            };
        });
    }
};
