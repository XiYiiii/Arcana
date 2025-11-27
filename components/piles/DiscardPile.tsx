
import React, { useState, useEffect } from 'react';
import { Card } from '../../types';
import { CardComponent } from '../CardComponent';

interface DiscardPileProps {
    cards: Card[];
    isOpponent?: boolean;
    onClick?: () => void;
}

export const DiscardPile: React.FC<DiscardPileProps> = ({ cards, isOpponent, onClick }) => {
    const topCard = cards[cards.length - 1];
    const [animate, setAnimate] = useState(false);

    // Trigger animation when top card changes
    useEffect(() => {
        if (topCard) {
            setAnimate(true);
            const timer = setTimeout(() => setAnimate(false), 300);
            return () => clearTimeout(timer);
        }
    }, [topCard?.instanceId]);

    return (
        <div onClick={onClick} className={`relative w-24 h-32 sm:w-28 sm:h-36 group ${onClick ? 'cursor-pointer' : ''}`}>
            <div className="absolute inset-0 bg-stone-900/30 rounded-lg border-2 border-dashed border-stone-800"></div>
            {topCard ? (
                <div className={`relative w-full h-full transform transition-transform duration-300 ${animate ? 'animate-pile-pop' : ''} hover:scale-105 hover:z-10 z-10`}>
                    <div className="scale-[0.6] origin-top-left w-[166%] h-[166%] pointer-events-none">
                        <CardComponent card={topCard} isFaceUp={true} disabled />
                    </div>
                    {/* Count Badge */}
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-stone-700 text-stone-200 border border-stone-500 rounded-full flex items-center justify-center text-xs font-bold shadow-lg z-20">
                        {cards.length}
                    </div>
                </div>
            ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-700 text-xs font-serif opacity-40">
                    墓地
                </div>
            )}
            <div className="mt-2 text-center text-[10px] text-stone-500 font-bold tracking-widest uppercase group-hover:text-stone-300 transition-colors">
                弃牌堆 {onClick && <span className="opacity-50 text-[8px] block">(点击查看)</span>}
            </div>
        </div>
    );
};
