import React, { useState, useEffect } from 'react';
import { GameState, Card, CardDefinition, EffectContext } from '../../types';
import { CardComponent } from '../CardComponent';
import { CARD_DEFINITIONS } from '../../data/cards';
import { discardCards } from '../../services/actions';

export const DebugOverlay = ({ 
    gameState, 
    setGameState, 
    createEffectContext,
    onClose 
}: { 
    gameState: GameState | null, 
    setGameState: React.Dispatch<React.SetStateAction<GameState | null>>, 
    createEffectContext: (pid: number, card: Card) => EffectContext,
    onClose: () => void 
}) => {
    const [activeTab, setActiveTab] = useState<'ADD' | 'DISCARD' | 'STATS' | 'INSPECT'>('ADD');
    const [targetPid, setTargetPid] = useState<number>(1);
    const [triggerEffect, setTriggerEffect] = useState(false);
    const [statInputs, setStatInputs] = useState({ p1hp: 0, p1atk: 0, p2hp: 0, p2atk: 0 });

    // Sync stats when opening
    useEffect(() => {
        if (gameState) {
            setStatInputs({
                p1hp: gameState.player1.hp,
                p1atk: gameState.player1.atk,
                p2hp: gameState.player2.hp,
                p2atk: gameState.player2.atk
            });
        }
    }, []); 

    if (!gameState) return null;

    const handleAddCard = (def: CardDefinition) => {
        const newCard: Card = {
            ...def,
            instanceId: `debug-${def.id}-${Date.now()}`,
            marks: [],
            description: def.description || ""
        };
        
        setGameState(prev => {
            if(!prev) return null;
            const key = targetPid === 1 ? 'player1' : 'player2';
            const p = prev[key];
            
            let pending = prev.pendingEffects;
            if (triggerEffect && newCard.onDraw) {
                pending = [...pending, { type: 'ON_DRAW', card: newCard, playerId: targetPid }];
            }
            
            return {
                ...prev,
                [key]: { ...p, hand: [...p.hand, newCard] },
                pendingEffects: pending
            };
        });
    };

    const handleDiscard = (card: Card) => {
        if (triggerEffect) {
             const ctx = createEffectContext(targetPid, card);
             discardCards(ctx, targetPid, [card.instanceId]);
        } else {
             setGameState(prev => {
                if(!prev) return null;
                const key = targetPid === 1 ? 'player1' : 'player2';
                const p = prev[key];
                return {
                    ...prev,
                    [key]: { 
                        ...p, 
                        hand: p.hand.filter(c => c.instanceId !== card.instanceId),
                        discardPile: [...p.discardPile, card]
                    }
                };
             });
        }
    };

    const applyStats = () => {
        setGameState(prev => {
            if(!prev) return null;
            return {
                ...prev,
                player1: { ...prev.player1, hp: Number(statInputs.p1hp), atk: Number(statInputs.p1atk) },
                player2: { ...prev.player2, hp: Number(statInputs.p2hp), atk: Number(statInputs.p2atk) }
            };
        });
    };

    const targetHand = targetPid === 1 ? gameState.player1.hand : gameState.player2.hand;

    return (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center font-sans" onClick={onClose}>
            <div className="bg-stone-900 border border-stone-600 w-[90vw] h-[90vh] flex flex-col rounded-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-stone-800 p-4 flex justify-between items-center border-b border-stone-700">
                    <h2 className="text-xl font-bold text-white">调试控制台</h2>
                    <button onClick={onClose} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded">关闭</button>
                </div>
                
                {/* Tabs */}
                <div className="flex bg-stone-800 border-b border-stone-700">
                    {(['ADD', 'DISCARD', 'STATS', 'INSPECT'] as const).map(t => (
                        <button 
                            key={t}
                            onClick={() => setActiveTab(t)}
                            className={`px-6 py-3 font-bold ${activeTab === t ? 'bg-stone-700 text-blue-400 border-b-2 border-blue-400' : 'text-stone-400 hover:bg-stone-750'}`}
                        >
                            {t === 'ADD' ? '添加' : t === 'DISCARD' ? '弃牌' : t === 'STATS' ? '状态' : '查看'}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-grow p-6 overflow-auto bg-stone-900 text-stone-200">
                    {/* Controls for ADD/DISCARD */}
                    {(activeTab === 'ADD' || activeTab === 'DISCARD') && (
                        <div className="mb-6 flex gap-6 bg-stone-800 p-4 rounded-lg items-center">
                            <div className="flex gap-2 items-center">
                                <span className="font-bold">目标:</span>
                                <button onClick={() => setTargetPid(1)} className={`px-3 py-1 rounded ${targetPid===1 ? 'bg-blue-600 text-white' : 'bg-stone-700'}`}>玩家 1</button>
                                <button onClick={() => setTargetPid(2)} className={`px-3 py-1 rounded ${targetPid===2 ? 'bg-blue-600 text-white' : 'bg-stone-700'}`}>玩家 2</button>
                            </div>
                            <label className="flex gap-2 items-center cursor-pointer">
                                <input type="checkbox" checked={triggerEffect} onChange={e => setTriggerEffect(e.target.checked)} className="w-5 h-5" />
                                <span className="font-bold">触发 {activeTab === 'ADD' ? '抽牌' : '弃牌'} 特效</span>
                            </label>
                        </div>
                    )}

                    {activeTab === 'ADD' && (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {CARD_DEFINITIONS.sort((a,b)=>a.rank - b.rank).map(def => (
                                <div key={def.id} className="flex flex-col gap-2">
                                    <button 
                                        onClick={() => handleAddCard(def)}
                                        className="bg-stone-800 hover:bg-stone-700 border border-stone-600 rounded p-2 flex flex-col items-center gap-2 h-full transition-colors"
                                    >
                                        <div className="text-2xl">{def.suit === 'CUPS' ? '🏆' : def.suit === 'WANDS' ? '🪄' : def.suit === 'SWORDS' ? '⚔️' : def.suit === 'PENTACLES' ? '🪙' : '💎'}</div>
                                        <div className="font-bold text-xs text-center">{def.name}</div>
                                        <div className="text-[10px] text-stone-500">Rank: {def.rank}</div>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'DISCARD' && (
                        <div className="flex flex-wrap gap-4">
                             {targetHand.length === 0 && <div className="text-stone-500">No cards in hand.</div>}
                             {targetHand.map(c => (
                                 <div key={c.instanceId} className="relative group w-32 h-40">
                                     <div className="absolute inset-0"><CardComponent card={c} isFaceUp={true} disabled /></div>
                                     <button 
                                        onClick={() => handleDiscard(c)}
                                        className="absolute inset-0 bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity font-bold text-white text-xl shadow-inner rounded-lg z-10"
                                     >
                                         弃置
                                     </button>
                                 </div>
                             ))}
                        </div>
                    )}

                    {activeTab === 'STATS' && (
                        <div className="flex gap-8 justify-center mt-10">
                            {[1, 2].map(pid => {
                                const isP1 = pid === 1;
                                return (
                                    <div key={pid} className="bg-stone-800 p-6 rounded-xl border border-stone-700 w-80">
                                        <h3 className="text-xl font-bold mb-4 border-b border-stone-600 pb-2">玩家 {pid}</h3>
                                        <div className="flex flex-col gap-4">
                                            <div className="flex justify-between items-center">
                                                <label>生命 (HP)</label>
                                                <input 
                                                    type="number" 
                                                    value={isP1 ? statInputs.p1hp : statInputs.p2hp} 
                                                    onChange={e => setStatInputs(p => ({...p, [isP1?'p1hp':'p2hp']: e.target.value}))}
                                                    className="bg-stone-900 border border-stone-600 rounded p-2 w-24 text-right"
                                                />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <label>攻击 (ATK)</label>
                                                <input 
                                                    type="number" 
                                                    value={isP1 ? statInputs.p1atk : statInputs.p2atk} 
                                                    onChange={e => setStatInputs(p => ({...p, [isP1?'p1atk':'p2atk']: e.target.value}))}
                                                    className="bg-stone-900 border border-stone-600 rounded p-2 w-24 text-right"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <button onClick={applyStats} className="bg-green-600 hover:bg-green-500 text-white font-bold px-8 rounded-xl self-center h-12">
                                更新状态
                            </button>
                        </div>
                    )}

                    {activeTab === 'INSPECT' && (
                        <div className="grid grid-cols-4 gap-4 h-full">
                            {[
                                { title: 'P1 牌库', cards: gameState.player1.deck },
                                { title: 'P1 弃牌', cards: gameState.player1.discardPile },
                                { title: 'P2 牌库', cards: gameState.player2.deck },
                                { title: 'P2 弃牌', cards: gameState.player2.discardPile },
                            ].map((col, i) => (
                                <div key={i} className="bg-stone-800 rounded p-4 flex flex-col h-full">
                                    <h4 className="font-bold text-blue-400 mb-2">{col.title} ({col.cards.length})</h4>
                                    <div className="flex-grow overflow-y-auto space-y-2 text-sm text-stone-400">
                                        {col.cards.map((c, idx) => (
                                            <div key={c.instanceId} className="border-b border-stone-700 pb-1">
                                                {idx+1}. {c.name} <span className="text-xs text-stone-600">({c.suit})</span>
                                            </div>
                                        ))}
                                        {col.cards.length === 0 && <span className="italic opacity-50">Empty</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};