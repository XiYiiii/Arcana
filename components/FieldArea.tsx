import React from 'react';
import { PlayerState } from '../types';
import { CardComponent } from './CardComponent';

interface FieldAreaProps {
  player1: PlayerState;
  player2: PlayerState;
}

export const FieldArea: React.FC<FieldAreaProps> = ({ player1, player2 }) => {
  return (
    <div className="h-[340px] border-t border-stone-800/30 flex items-center justify-center relative z-0">
       {/* Decorative center line */}
       <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-amber-800 to-transparent"></div>
       </div>
       
       <div className="flex gap-10 sm:gap-16 z-10 perspective-1000">
         <div className="flex flex-col items-center gap-2">
            <span className="text-[9px] text-stone-500 font-bold tracking-widest uppercase">对手</span>
            <div className="transform scale-105 transition-transform">
              <CardComponent card={player2.fieldSlot} isFaceUp={player2.isFieldCardRevealed} disabled />
            </div>
         </div>
         
         <div className="flex flex-col items-center gap-2">
            <span className="text-[9px] text-stone-500 font-bold tracking-widest uppercase">玩家</span>
            <div className="transform scale-105 transition-transform">
               <CardComponent card={player1.fieldSlot} isFaceUp={player1.isFieldCardRevealed} disabled />
            </div>
         </div>
       </div>
    </div>
  );
};