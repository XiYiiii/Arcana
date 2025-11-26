import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { modifyPlayer, discardCards, addMarkToCard, returnCard } from '../../../services/actions';

export const WANDS_SUN: CardDefinition = {
    id: 'wands-sun', name: '权杖·太阳', suit: CardSuit.WANDS, rank: 219,
    keywords: [Keyword.SCRY, Keyword.RETURN, Keyword.IMPRINT],
    onDraw: (ctx) => { modifyPlayer(ctx, ctx.sourcePlayerId, p => ({ ...p, hand: p.hand.map(c => c.instanceId===ctx.card.instanceId ? addMarkToCard(c, 'mark-sun') : c) })); },
    onReveal: (ctx) => {
        ctx.setGameState(prev => {
            if(!prev) return null;
            const myKey = ctx.sourcePlayerId === 1 ? 'player1' : 'player2';
            const deck = prev[myKey].deck;
            if(deck.length === 0) return prev;
            
            const toLook = deck.slice(0, 2);
            
            const keepCards = (keep: any[], toss: any[]) => {
                modifyPlayer(ctx, ctx.sourcePlayerId, p => ({
                     ...p,
                     deck: p.deck.slice(toLook.length),
                     hand: [...p.hand, ...keep],
                     discardPile: [...p.discardPile, ...toss]
                }));
                ctx.setGameState(s=>s?({...s, interaction:null}):null);
            };

            return {
                ...prev,
                interaction: {
                    id: `sun-scry-${Date.now()}`,
                    playerId: ctx.sourcePlayerId,
                    title: "权杖·太阳 - 占卜",
                    description: `看到了 ${toLook.length} 张牌: ${toLook.map(c=>`[${c.name}]`).join(', ')}。\n请选择保留方案:`,
                    inputType: 'BUTTON', 
                    options: [
                        { 
                            label: "全部保留", 
                            action: () => keepCards(toLook, []) 
                        },
                        ...(toLook.length > 0 ? [{
                             label: `仅保留 ${toLook[0].name}`, 
                             action: () => keepCards([toLook[0]], toLook.slice(1))
                        }] : []),
                        ...(toLook.length > 1 ? [{
                             label: `仅保留 ${toLook[1].name}`, 
                             action: () => keepCards([toLook[1]], [toLook[0]])
                        }] : []),
                        { 
                            label: "全部弃置", 
                            action: () => keepCards([], toLook) 
                        }
                    ]
                }
            }
        });
    },
    onDiscard: (ctx) => {
        returnCard(ctx, ctx.card.instanceId);
        modifyPlayer(ctx, ctx.sourcePlayerId, p => ({ ...p, hand: p.hand.map(c => c.instanceId===ctx.card.instanceId ? { ...c, marks: c.marks.filter(m=>m!=='mark-sun') } : c) }));
    }
};