
import React from 'react';
import { Card } from '../../types';
import { CardComponent } from '../CardComponent';

interface CardPileOverlayProps {
    title: string;
    cards: Card[];
    onClose: () => void;
    sorted?: boolean; // If true, sort cards by Rank (for Deck viewing)
}

export const CardPileOverlay: React.FC<CardPileOverlayProps> = ({ title, cards, onClose, sorted }) => {
    const displayCards = sorted ? [...cards].sort((a, b) => a.rank - b.rank) : cards;

    return (
        <div className="fixed inset-0 z-[250] bg-stone-900/95 flex flex-col text-stone-100 font-sans animate-in fade-in duration-200">
            <div className="p-4 border-b border-stone-700 flex justify-between items-center bg-stone-800 shadow-lg z-10">
                <div className="flex items-center gap-3">
                     <h2 className="text-2xl font-serif font-bold text-stone-300 tracking-widest">
                         {title}
                     </h2>
                     <span className="bg-stone-700 text-stone-400 text-sm px-2 py-1 rounded-full font-mono">
                         {cards.length} 张
                     </span>
                </div>
                <button onClick={onClose} className="text-stone-400 hover:text-white px-6 py-2 rounded border border-stone-600 hover:bg-stone-700 transition-colors">
                    关闭
                </button>
            </div>

            <div className="flex-grow overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-stone-700">
                <div className="flex flex-wrap gap-6 justify-center max-w-[1400px] mx-auto">
                    {displayCards.map((card, index) => (
                        <div key={card.instanceId} className="relative flex flex-col items-center group">
                            <span className="text-[10px] text-stone-600 mb-1 font-mono">#{index + 1}</span>
                            <div className="transform transition duration-300 group-hover:scale-105 group-hover:z-10 shadow-lg">
                                <CardComponent 
                                    card={card} 
                                    isFaceUp={true} 
                                    disabled 
                                />
                            </div>
                        </div>
                    ))}
                    {displayCards.length === 0 && (
                        <div className="text-center text-stone-500 mt-20 text-xl font-serif italic">
                            此处空空如也。
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
