
import React, { useState } from 'react';
import { CardDefinition, CardSuit } from '../../types';
import { CARD_DEFINITIONS } from '../../data/cards';
import { CardComponent } from '../CardComponent';

interface DeckBuilderScreenProps {
  enabledCardIds: string[];
  onSave: (ids: string[]) => void;
  onBack: () => void;
}

export const DeckBuilderScreen: React.FC<DeckBuilderScreenProps> = ({ enabledCardIds, onSave, onBack }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(enabledCardIds));
  const [filterSuit, setFilterSuit] = useState<CardSuit | 'ALL'>('ALL');

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

  const filteredCards = CARD_DEFINITIONS
    .filter(c => !c.isTreasure) // Don't show treasures in deck builder
    .filter(c => filterSuit === 'ALL' || c.suit === filterSuit)
    .sort((a, b) => a.rank - b.rank);

  const handleSave = () => {
    onSave(Array.from(selectedIds));
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900 flex flex-col text-stone-100 font-sans">
        {/* Header */}
        <div className="p-4 border-b border-stone-700 flex justify-between items-center bg-stone-950 shadow-lg z-20">
            <div className="flex items-center gap-4">
                <h2 className="text-2xl font-serif font-bold text-amber-500 tracking-widest">卡牌构建</h2>
                <span className="text-stone-500 text-sm bg-stone-900 px-3 py-1 rounded-full border border-stone-800">
                    已选: <span className="text-white font-bold">{selectedIds.size}</span> 张
                </span>
            </div>
            <div className="flex gap-4">
                <button onClick={onBack} className="text-stone-400 hover:text-white px-6 py-2 rounded border border-stone-600 hover:bg-stone-800 transition-colors">
                    取消
                </button>
                <button onClick={handleSave} className="bg-amber-700 hover:bg-amber-600 text-white px-6 py-2 rounded font-bold shadow-lg transition-colors border border-amber-600">
                    保存并返回
                </button>
            </div>
        </div>

        {/* Filters */}
        <div className="p-4 bg-stone-900 border-b border-stone-800 flex gap-4 justify-center items-center sticky top-0 z-10 shadow-md">
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