import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, returnCard } from '../../../services/actions';

export const PENTACLES_STAR: CardDefinition = {
    id: 'pentacles-star', name: '星币·星星', suit: CardSuit.PENTACLES, rank: 417,
    keywords: [Keyword.RETURN],
    onReveal: (ctx) => {
        ctx.setGameState(prev => ({
            ...prev!,
            interaction: {
                id: `pentacles-star-choice-${Date.now()}`,
                playerId: ctx.sourcePlayerId,
                title: "星币·星星",
                description: "选择一种天体归来所有同名卡牌:",
                options: [
                    { label: "⭐ 星星", action: () => returnAll(ctx, '星星') },
                    { label: "🌙 月亮", action: () => returnAll(ctx, '月亮') },
                    { label: "☀️ 太阳", action: () => returnAll(ctx, '太阳') }
                ]
            }
        }));
    }
};

const returnAll = (ctx: any, nameStr: string) => {
    const key = ctx.sourcePlayerId === 1 ? 'player1' : 'player2';
    const discardPile = ctx.gameState[key].discardPile;
    const targets = discardPile.filter((c: any) => c.name.includes(nameStr));
    
    targets.forEach((c: any) => {
        returnCard(ctx, c.instanceId);
    });
    
    ctx.log(`【星币·星星】引力！归来了 ${targets.length} 张 [${nameStr}]。`);
    ctx.setGameState((s:any) => s ? ({...s, interaction: null}) : null);
};