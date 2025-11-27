
import React from 'react';

interface DeckPileProps {
    count: number;
    isOpponent?: boolean;
    onClick?: () => void;
}

export const DeckPile: React.FC<DeckPileProps> = ({ count, isOpponent, onClick }) => (
    <div 
        onClick={onClick}
        className={`relative w-24 h-32 sm:w-28 sm:h-36 group perspective-1000 ${onClick ? 'cursor-pointer' : 'cursor-default'}`} 
        title="抽牌堆"
    >
        <div className="absolute inset-0 bg-stone-900/50 rounded-lg border-2 border-dashed border-stone-700 transform translate-x-1 translate-y-1"></div>
        {count > 0 ? (
            <div className="relative w-full h-full rounded-lg bg-stone-800 border border-stone-600 shadow-xl flex items-center justify-center transition-transform group-hover:-translate-y-1 z-10">
                 {/* Card Back Pattern */}
                 <div className="absolute inset-1 border border-stone-700/50 rounded flex items-center justify-center bg-stone-900">
                    <div className="text-2xl opacity-20">🔮</div>
                 </div>
                 {/* Count Badge */}
                 <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-900 text-blue-100 border border-blue-700 rounded-full flex items-center justify-center text-xs font-bold shadow-lg z-10">
                    {count}
                 </div>
                 {/* Thickness effect */}
                 {count > 1 && <div className="absolute inset-0 bg-stone-800 rounded-lg border border-stone-600 shadow-sm z-[-1] translate-x-[2px] translate-y-[2px]"></div>}
                 {count > 5 && <div className="absolute inset-0 bg-stone-800 rounded-lg border border-stone-600 shadow-sm z-[-2] translate-x-[4px] translate-y-[4px]"></div>}
            </div>
        ) : (
            <div className="w-full h-full flex items-center justify-center text-stone-600 text-xs font-serif opacity-50">
                牌库空
            </div>
        )}
        <div className="mt-2 text-center text-[10px] text-stone-500 font-bold tracking-widest uppercase group-hover:text-stone-300">
            抽牌堆 {onClick && <span className="opacity-50 text-[8px] block">(点击查看)</span>}
        </div>
    </div>
);
