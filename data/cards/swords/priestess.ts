
import { CardDefinition, CardSuit, InstantWindow } from '../../../types';
import { modifyPlayer } from '../../../services/actions';

export const SWORDS_PRIESTESS: CardDefinition = {
    id: 'swords-priestess', name: '宝剑·女祭司', suit: CardSuit.SWORDS, rank: 302,
    description: "打出：这回合每受到1次伤害，对己方造成1点伤害。这回合每对对方造成1点伤害，恢复己方1点生命值。\n插入(亮牌前)：本回合你即将受到的，超过己方[Atk]的伤害转变为恢复己方生命。",
    keywords: [],
    onReveal: (ctx) => {
        modifyPlayer(ctx, ctx.sourcePlayerId, p => ({ ...p, damageReflection: true, hasLifesteal: true })); // Custom flags added to PlayerState
    },
    canInstant: (w) => w === InstantWindow.BEFORE_REVEAL,
    onInstant: (ctx) => {
        modifyPlayer(ctx, ctx.sourcePlayerId, p => ({ ...p, incomingDamageConversion: true }));
    }
};
