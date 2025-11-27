
import React from 'react';

interface TreasureVaultProps {
    position: 'top' | 'bottom';
    onClick?: () => void;
}

export const TreasureVault: React.FC<TreasureVaultProps> = ({ position, onClick }) => (
    <div 
        onClick={onClick}
        className={`absolute ${position === 'top' ? '-top-8' : '-bottom-8'} left-1/2 -translate-x-1/2 w-24 sm:w-28 flex justify-center z-0 opacity-80 ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : 'pointer-events-none'}`}
    >
        <div className="bg-stone-900/90 border border-amber-700/60 rounded px-2 py-0.5 flex items-center gap-1 shadow-[0_0_10px_rgba(180,83,9,0.3)] backdrop-blur-sm">
             <span className="text-[10px] text-amber-500 font-serif font-bold tracking-wider">✨ 宝库</span>
        </div>
    </div>
);
