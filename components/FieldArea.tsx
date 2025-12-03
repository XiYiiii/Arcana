
import React from 'react';
import { PlayerState, GameState } from '../types';
import { CardComponent } from './CardComponent';

interface FieldAreaProps {
  gameState: GameState;
  player1: PlayerState;
  player2: PlayerState;
}

export const FieldArea: React.FC<FieldAreaProps> = ({ gameState, player1, player2 }) => {
  const isActive = gameState.field?.active;

  return (
    <div className="h-[340px] border-t border-stone-800/30 flex items-center justify-center relative z-0">
       {/* Decorative center line */}
       <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-amber-800 to-transparent"></div>
       </div>
       
       <div className="flex gap-8 sm:gap-12 z-10 perspective-1000 items-center">
         {/* Player 2 Slot */}
         <div className="flex flex-col items-center gap-2">
            <span className="text-[9px] text-stone-500 font-bold tracking-widest uppercase">对手</span>
            <div className="transform scale-105 transition-transform">
              <CardComponent card={player2.fieldSlot} isFaceUp={player2.isFieldCardRevealed} disabled />
            </div>
         </div>
         
         {/* Field Card Slot */}
         <div className="flex flex-col items-center gap-2 mt-4 transition-all duration-500">
             <span className={`text-[9px] font-bold tracking-widest uppercase flex items-center gap-1 transition-colors ${isActive ? 'text-emerald-400' : 'text-stone-500'}`}>
                {gameState.field 
                    ? (isActive ? '🏟️ 场地激活 (生效)' : '🏟️ 场地未激活') 
                    : '场地空置'}
             </span>
             <div className={`
                relative w-36 h-48 border-2 rounded-lg flex items-center justify-center transition-all duration-500
                ${gameState.field 
                    ? (isActive ? 'border-emerald-500/80 shadow-[0_0_40px_rgba(16,185,129,0.2)] bg-emerald-900/10' : 'border-stone-600/50 opacity-80 grayscale-[0.8]') 
                    : 'border-dashed border-emerald-900/30 bg-black/20'}
             `}>
                {gameState.field ? (
                    <div className="transform scale-90">
                        <CardComponent card={gameState.field.card} isFaceUp={true} disabled />
                        <div className={`absolute -top-2 -right-2 text-white text-[9px] px-2 py-0.5 rounded-full font-bold shadow transition-colors ${isActive ? 'bg-emerald-700' : 'bg-stone-700'}`}>
                           P{gameState.field.ownerId}
                        </div>
                        {gameState.field.counter > 0 && (
                             <div className="absolute -bottom-2 -right-2 bg-amber-700 text-white text-[9px] px-2 py-0.5 rounded-full font-bold shadow">
                               Cnt: {gameState.field.counter}
                             </div>
                        )}
                    </div>
                ) : (
                    <span className="text-emerald-900/30 text-4xl">🏟️</span>
                )}
             </div>
         </div>

         {/* Player 1 Slot */}
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
