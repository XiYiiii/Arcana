import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, addQuest } from '../../../services/actions';
import { CARD_DEFINITIONS } from '../../cards';

export const SWORDS_WORLD: CardDefinition = {
    id: 'swords-world', name: '宝剑·世界', suit: CardSuit.SWORDS, rank: 321,
    keywords: [Keyword.QUEST],
    onDraw: (ctx) => {
        ctx.setGameState(prev => ({
            ...prev!,
            interaction: {
                id: `swords-world-draw-${Date.now()}`,
                playerId: ctx.sourcePlayerId,
                title: "宝剑·世界",
                description: "指定一张宝藏牌加入手牌：",
                options: [
                    { label: "💎 宝剑", action: () => giveTreasure(ctx, 'treasure-swords') },
                    { label: "💎 圣杯", action: () => giveTreasure(ctx, 'treasure-cups') },
                    { label: "💎 权杖", action: () => giveTreasure(ctx, 'treasure-wands') }
                ]
            }
        }));
    },
    onReveal: (ctx) => {
        const q = {
            id: 'quest-swords-world',
            name: '宝剑·世界',
            description: '造成 10 点伤害',
            progress: 0,
            target: 10
        };
        addQuest(ctx, 1, q);
        addQuest(ctx, 2, q);
    }
};

const giveTreasure = (ctx: any, id: string) => {
    const def = CARD_DEFINITIONS.find(c => c.id === id);
    if (def) {
        const card = { ...def, instanceId: `treasure-${Date.now()}`, marks: [], description: def.description || "" };
        modifyPlayer(ctx, ctx.sourcePlayerId, p => ({ ...p, hand: [...p.hand, card] }));
        ctx.log(`[宝剑·世界] 获取了 [${def.name}]！`);
    }
    ctx.setGameState((s:any) => s ? ({...s, interaction: null}) : null);
};