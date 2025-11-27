

import React, { useState } from 'react';
import { CardSuit } from '../../types';
import { CARD_DEFINITIONS } from '../../data/cards';
import { CardComponent } from '../CardComponent';
import { INITIAL_HP, MAX_HAND_SIZE } from '../../constants';

interface GameSetupScreenProps {
  enabledCardIds: string[];
  initialSettings: { hp: number; handSize: number };
  onSave: (ids: string[], settings: { hp: number; handSize: number }) => void;
  onBack: () => void;
}

export const GameSetupScreen: React.FC<GameSetupScreenProps> = ({ enabledCardIds, initialSettings, onSave, onBack }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(enabledCardIds));
  const [filterSuit, setFilterSuit] = useState<CardSuit | 'ALL'>('ALL');
  
  // Game Settings State
  const [hp, setHp] = useState(initialSettings.hp);
  const [handSize, setHandSize] = useState(initialSettings.handSize);

  const filteredCards = CARD_DEFINITIONS
    .filter(c => !c.isTreasure) // Don't show treasures in deck builder
    .filter(c => filterSuit === 'ALL' || c.suit === filterSuit)
    .sort((a, b) => a.rank - b.rank);

  const toggleCard = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredCards.length) {
        setSelectedIds(new Set());
    } else {
        const newSet = new Set(selectedIds);
        filteredCards.forEach(c => newSet.add(c.id));
        setSelectedIds(newSet);
    }
  };

  const handleSave = () => {
    onSave(Array.from(selectedIds), { hp, handSize });
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900 flex flex-col text-stone-100 font-sans">
        {/* Header */}
        <div className="p-4 border-b border-stone-700 flex justify-between items-center bg-stone-950 shadow-lg z-20">
            <div className="flex items-center gap-6">
                <h2 className="text-2xl font-serif font-bold text-amber-500 tracking-widest">开局设置</h2>
            </div>
            <div className="flex gap-4">
                <button onClick={onBack} className="text-stone-400 hover:text-white px-6 py-2 rounded border border-stone-600 hover:bg-stone-800 transition-colors">
                    取消
                </button>
                <button onClick={handleSave} className="bg-amber-700 hover:bg-amber-600 text-white px-6 py-2 rounded font-bold shadow-lg transition-colors border border-amber-600">
                    确认开始
                </button>
            </div>
        </div>
        
        {/* Settings Panel */}
        <div className="bg-stone-900 p-6 border-b border-stone-800 flex flex-wrap gap-8 justify-center items-center shadow-inner">
             <div className="flex items-center gap-4 bg-stone-800 px-6 py-3 rounded-xl border border-stone-700">
                 <span className="text-stone-400 font-bold uppercase tracking-wider text-sm">初始生命值</span>
                 <div className="flex items-center gap-3">
                     <button onClick={() => setHp(Math.max(1, hp - 5))} className="w-8 h-8 rounded bg-stone-700 hover:bg-stone-600 text-white font-bold">-</button>
                     <span className="text-2xl font-serif font-bold text-emerald-400 w-12 text-center">{hp}</span>
                     <button onClick={() => setHp(hp + 5)} className="w-8 h-8 rounded bg-stone-700 hover:bg-stone-600 text-white font-bold">+</button>
                 </div>
             </div>

             <div className="flex items-center gap-4 bg-stone-800 px-6 py-3 rounded-xl border border-stone-700">
                 <span className="text-stone-400 font-bold uppercase tracking-wider text-sm">初始手牌数</span>
                 <div className="flex items-center gap-3">
                     <button onClick={() => setHandSize(Math.max(1, handSize - 1))} className="w-8 h-8 rounded bg-stone-700 hover:bg-stone-600 text-white font-bold">-</button>
                     <span className="text-2xl font-serif font-bold text-blue-400 w-8 text-center">{handSize}</span>
                     <button onClick={() => setHandSize(Math.min(7, handSize + 1))} className="w-8 h-8 rounded bg-stone-700 hover:bg-stone-600 text-white font-bold">+</button>
                 </div>
             </div>
             
             <div className="text-stone-500 text-sm bg-stone-950 px-4 py-2 rounded-full border border-stone-800">
                牌库卡牌: <span className="text-white font-bold">{selectedIds.size}</span> 张
            </div>
        </div>

        {/* Filters */}
        <div className="p-2 bg-stone-900 border-b border-stone-800 flex gap-4 justify-center items-center sticky top-0 z-10 shadow-md">
            <div className="flex gap-2">
                {(['ALL', 'CUPS', 'WANDS', 'SWORDS', 'PENTACLES'] as const).map(suit => (
                    <button
                        key={suit}
                        onClick={() => setFilterSuit(suit as any)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wider transition-all ${
                            filterSuit === suit 
                            ? 'bg-amber-900/50 text-amber-100 border border-amber-700' 
                            : 'bg-stone-800 text-stone-500 border border-stone-700 hover:bg-stone-700'
                        }`}
                    >
                        {suit === 'ALL' ? '全部' : suit}
                    </button>
                ))}
            </div>
            <div className="w-px h-6 bg-stone-700 mx-2"></div>
            <button onClick={toggleAll} className="text-xs text-stone-400 hover:text-white underline">
                全选 / 全不选
            </button>
        </div>

        {/* Grid */}
        <div className="flex-grow overflow-y-auto p-6 bg-stone-900/50">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-6 justify-items-center max-w-[1800px] mx-auto pb-20">
                {filteredCards.map(def => {
                    const isSelected = selectedIds.has(def.id);
                    return (
                        <div 
                            key={def.id} 
                            onClick={() => toggleCard(def.id)}
                            className={`relative group cursor-pointer transform transition-all duration-200 ${isSelected ? 'scale-100 opacity-100' : 'scale-95 opacity-40 grayscale hover:opacity-70'}`}
                        >
                            <div className={`absolute -inset-2 rounded-xl border-2 transition-all duration-300 ${isSelected ? 'border-amber-500/50 bg-amber-500/5' : 'border-transparent'}`}></div>
                            {isSelected && (
                                <div className="absolute -top-2 -right-2 bg-amber-500 text-black w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm z-20 shadow-lg">
                                    ✓
                                </div>
                            )}
                            <div className="pointer-events-none">
                                <CardComponent 
                                    card={{...def, instanceId: 'builder', marks: [], description: def.description || ""}} 
                                    isFaceUp={true} 
                                    disabled={!isSelected}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
  );
};