import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, shufflePlayerDeck } from '../../../services/actions';
import { CARD_DEFINITIONS } from '../../cards';

export const PENTACLES_TOWER: CardDefinition = {
    id: 'pentacles-tower', name: '星币·高塔', suit: CardSuit.PENTACLES, rank: 416,
    keywords: [Keyword.SHUFFLE],
    onDraw: (ctx) => {
        // Find random Tower
        const towers = CARD_DEFINITIONS.filter(c => c.name.includes('高塔'));
        if (towers.length === 0) return; // Should not happen
        
        const randTowerDef = towers[Math.floor(Math.random() * towers.length)];
        const newTower = { 
            ...randTowerDef, 
            instanceId: `tower-spawn-${Date.now()}`, 
            marks: [], 
            description: randTowerDef.description || "" 
        };
        
        ctx.log(`【星币·高塔】崩塌！生成了 [${newTower.name}]。`);
        
        modifyPlayer(ctx, ctx.sourcePlayerId, p => ({
            ...p,
            hand: p.hand.filter(c => c.instanceId !== ctx.card.instanceId), // Remove self from hand
            deck: [...p.deck, ctx.card, newTower] // Add self + new tower to deck
        }));
        
        shufflePlayerDeck(ctx, ctx.sourcePlayerId);
    }
};