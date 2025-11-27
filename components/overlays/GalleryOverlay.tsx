
import React, { useState, useMemo } from 'react';
import { CardSuit, Keyword } from '../../types';
import { CardComponent } from '../CardComponent';
import { CARD_DEFINITIONS } from '../../data/cards';
import { KEYWORD_DISPLAY_NAMES, SUIT_ICONS } from '../../constants';

export const GalleryOverlay = ({ onClose }: { onClose: () => void }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSuit, setFilterSuit] = useState<CardSuit | 'ALL'>('ALL');
    const [selectedKeywords, setSelectedKeywords] = useState<Set<Keyword>>(new Set());

    const toggleKeyword = (k: Keyword) => {
        const next = new Set(selectedKeywords);
        if (next.has(k)) next.delete(k);
        else next.add(k);
        setSelectedKeywords(next);
    };

    const suitOptions = [
        { value: 'ALL', label: '全部', icon: '🃏' },
        { value: CardSuit.CUPS, label: '圣杯', icon: SUIT_ICONS[CardSuit.CUPS] },
        { value: CardSuit.WANDS, label: '权杖', icon: SUIT_ICONS[CardSuit.WANDS] },
        { value: CardSuit.SWORDS, label: '宝剑', icon: SUIT_ICONS[CardSuit.SWORDS] },
        { value: CardSuit.PENTACLES, label: '星币', icon: SUIT_ICONS[CardSuit.PENTACLES] },
        { value: CardSuit.TREASURE, label: '宝藏', icon: SUIT_ICONS[CardSuit.TREASURE] },
    ];

    const filteredCards = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase().trim();
        
        return CARD_DEFINITIONS.filter(c => {
            // Suit Filter
            if (filterSuit !== 'ALL' && c.suit !== filterSuit) return false;

            // Keyword Filter (OR Logic: match if card has ANY of the selected keywords)
            if (selectedKeywords.size > 0) {
                if (!c.keywords || !c.keywords.some(k => selectedKeywords.has(k))) {
                    return false;
                }
            }

            // Search Filter
            if (lowerSearch) {
                const nameMatch = c.name.toLowerCase().includes(lowerSearch);
                const descMatch = (c.description || "").toLowerCase().includes(lowerSearch);
                
                // Allow searching by suit name (e.g. "圣杯")
                const suitLabel = suitOptions.find(o => o.value === c.suit)?.label || "";
                const suitMatch = c.suit.toLowerCase().includes(lowerSearch) || suitLabel.includes(lowerSearch);

                if (!nameMatch && !descMatch && !suitMatch) return false;
            }

            return true;
        }).sort((a, b) => {
            // Sort: Treasure first, then Rank
            if (a.isTreasure && !b.isTreasure) return -1;
            if (!a.isTreasure && b.isTreasure) return 1;
            return a.rank - b.rank;
        });
    }, [searchTerm, filterSuit, selectedKeywords]);

    return (
        <div className="fixed inset-0 z-[250] bg-stone-950 text-stone-100 font-sans flex animate-in fade-in duration-300">
            {/* Sidebar */}
            <div className="w-80 bg-stone-900 border-r border-stone-800 flex flex-col shadow-2xl z-20 flex-shrink-0">
                {/* Header & Search */}
                <div className="p-5 border-b border-stone-800 bg-stone-900">
                    <h2 className="text-xl font-serif font-bold text-amber-500 mb-4 tracking-widest flex items-center gap-2">
                        <span>🔍</span> 筛选器
                    </h2>
                    <div className="relative group">
                        <input 
                            type="text" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="搜索名称、描述、花色..." 
                            className="w-full bg-stone-950 border border-stone-700 rounded-lg px-4 py-2.5 pl-10 text-sm focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-none transition-all placeholder:text-stone-600 group-hover:border-stone-600"
                        />
                        <span className="absolute left-3 top-3 text-stone-500 text-xs group-hover:text-amber-500 transition-colors">🔎</span>
                        {searchTerm && (
                            <button 
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-3 text-stone-600 hover:text-stone-400 text-xs"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-8">
                    {/* Suit Section */}
                    <div>
                        <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-3 px-1 border-l-2 border-stone-700 pl-2">
                            花色分类
                        </h3>
                        <div className="space-y-1">
                            {suitOptions.map(opt => {
                                const isActive = filterSuit === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        onClick={() => setFilterSuit(opt.value as any)}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-all duration-200 group ${
                                            isActive 
                                            ? 'bg-amber-900/40 text-amber-100 border border-amber-800/50 shadow-sm' 
                                            : 'text-stone-400 hover:bg-stone-800 hover:text-stone-200 border border-transparent'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`text-lg ${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform`}>{opt.icon}</span>
                                            <span className="font-medium">{opt.label}</span>
                                        </div>
                                        {isActive && <span className="text-amber-500 font-bold">●</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Keyword Section */}
                    <div>
                        <div className="flex justify-between items-center mb-3 px-1 border-l-2 border-stone-700 pl-2">
                            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest">
                                效果关键词
                            </h3>
                            {selectedKeywords.size > 0 && (
                                <button 
                                    onClick={() => setSelectedKeywords(new Set())} 
                                    className="text-[10px] text-amber-600 hover:text-amber-400 underline decoration-amber-800 hover:decoration-amber-500"
                                >
                                    重置
                                </button>
                            )}
                        </div>
                        <div className="space-y-2">
                            {Object.entries(KEYWORD_DISPLAY_NAMES).map(([key, name]) => {
                                const k = key as Keyword;
                                const isChecked = selectedKeywords.has(k);
                                return (
                                    <label 
                                        key={k} 
                                        className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                                            isChecked 
                                            ? 'bg-stone-800 text-stone-200' 
                                            : 'hover:bg-stone-800/50 text-stone-400'
                                        }`}
                                    >
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                            isChecked 
                                            ? 'bg-amber-600 border-amber-500' 
                                            : 'bg-stone-950 border-stone-700 group-hover:border-stone-500'
                                        }`}>
                                            {isChecked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            className="hidden" 
                                            checked={isChecked} 
                                            onChange={() => toggleKeyword(k)}
                                        />
                                        <span className="text-xs font-medium">{name}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="flex-1 flex flex-col min-w-0 bg-stone-900">
                <div className="h-16 border-b border-stone-800 bg-stone-950/50 backdrop-blur flex items-center justify-between px-8 z-10 sticky top-0">
                    <div className="flex items-baseline gap-4">
                        <h2 className="text-2xl font-serif font-black text-stone-200 tracking-widest drop-shadow-sm">
                            CARD GALLERY
                        </h2>
                        <span className="text-sm font-mono text-stone-500">
                            Result: <span className="text-amber-500 font-bold">{filteredCards.length}</span>
                        </span>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="group flex items-center gap-2 text-stone-500 hover:text-stone-300 transition-colors px-4 py-2 rounded-lg hover:bg-stone-800"
                    >
                        <span className="text-sm font-bold uppercase tracking-wider">Close</span>
                        <div className="bg-stone-800 group-hover:bg-stone-700 w-6 h-6 rounded flex items-center justify-center text-xs">✕</div>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-stone-800/30 to-stone-900">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8 pb-20 justify-items-center max-w-[1600px] mx-auto">
                        {filteredCards.map(def => (
                            <div key={def.id} className="flex flex-col items-center group relative">
                                <div className="transform transition duration-300 group-hover:scale-105 group-hover:z-10 group-hover:shadow-2xl rounded-lg">
                                    <CardComponent 
                                        card={{...def, instanceId: 'gallery', marks: [], description: def.description || ""}} 
                                        isFaceUp={true} 
                                        disabled 
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {filteredCards.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-stone-500 pb-20 opacity-50">
                            <div className="text-6xl mb-4">📭</div>
                            <div className="text-xl font-serif italic">未找到匹配的卡牌</div>
                            <button onClick={() => {setSearchTerm(''); setFilterSuit('ALL'); setSelectedKeywords(new Set());}} className="mt-4 text-amber-600 hover:underline">清除所有筛选</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};