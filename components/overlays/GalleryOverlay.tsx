import React, { useState } from 'react';
import { CardSuit, Keyword } from '../../types';
import { CardComponent } from '../CardComponent';
import { CARD_DEFINITIONS } from '../../data/cards';
import { KEYWORD_DISPLAY_NAMES } from '../../constants';

export const GalleryOverlay = ({ onClose }: { onClose: () => void }) => {
    const [filterSuit, setFilterSuit] = useState<CardSuit | 'ALL'>('ALL');
    const [filterKeyword, setFilterKeyword] = useState<Keyword | 'ALL'>('ALL');

    const filteredCards = CARD_DEFINITIONS.filter(c => {
        if (filterSuit !== 'ALL' && c.suit !== filterSuit) return false;
        if (filterKeyword !== 'ALL' && (!c.keywords || !c.keywords.includes(filterKeyword))) return false;
        return true;
    }).sort((a, b) => a.rank - b.rank);

    return (
        <div className="fixed inset-0 z-[250] bg-stone-900 flex flex-col text-stone-100 font-sans">
            <div className="p-4 border-b border-stone-700 flex justify-between items-center bg-stone-800 shadow-lg z-10">
                <h2 className="text-2xl font-serif font-bold text-yellow-500 tracking-widest">图鉴</h2>
                <button onClick={onClose} className="text-stone-400 hover:text-white px-6 py-2 rounded border border-stone-600 hover:bg-stone-800 transition-colors">关闭</button>
            </div>
            
            <div className="p-4 flex gap-4 flex-wrap bg-stone-800/50 border-b border-stone-700 z-10 justify-center">
                <select className="bg-stone-800 text-white px-4 py-2 rounded border border-stone-600 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none" value={filterSuit} onChange={e => setFilterSuit(e.target.value as any)}>
                    <option value="ALL">所有花色</option>
                    <option value={CardSuit.CUPS}>🏆 圣杯</option>
                    <option value={CardSuit.WANDS}>🪄 权杖</option>
                    <option value={CardSuit.SWORDS}>⚔️ 宝剑</option>
                    <option value={CardSuit.PENTACLES}>🪙 星币</option>
                    <option value={CardSuit.TREASURE}>💎 宝藏</option>
                </select>
                
                <select className="bg-stone-800 text-white px-4 py-2 rounded border border-stone-600 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none" value={filterKeyword} onChange={e => setFilterKeyword(e.target.value as any)}>
                     <option value="ALL">所有关键词</option>
                     {Object.entries(KEYWORD_DISPLAY_NAMES).map(([k, v]) => (
                         <option key={k} value={k}>{v}</option>
                     ))}
                </select>
            </div>

            <div className="flex-grow overflow-y-auto p-4 sm:p-8 bg-stone-900 scrollbar-thin scrollbar-thumb-stone-700">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-8 pb-20 justify-items-center max-w-[1600px] mx-auto">
                    {filteredCards.map(def => (
                        <div key={def.id} className="flex flex-col items-center transform transition duration-300 hover:scale-110 hover:z-10">
                            <CardComponent 
                                card={{...def, instanceId: 'gallery', marks: [], description: def.description || ""}} 
                                isFaceUp={true} 
                                disabled 
                            />
                        </div>
                    ))}
                </div>
                {filteredCards.length === 0 && <div className="text-center text-stone-500 mt-20 text-2xl font-serif">未找到匹配卡牌。</div>}
            </div>
        </div>
    );
};