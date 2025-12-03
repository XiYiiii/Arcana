
import React, { useState, useEffect } from 'react';
import { PendingEffect } from '../../types';
import { CardComponent } from '../CardComponent';

export const EffectOverlay = ({ effect, onDismiss }: { effect: PendingEffect, onDismiss?: () => void }) => {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setAnimate(true));
  }, []);

  const isP1 = effect.playerId === 1;

  let title = "";
  let colorClass = "";
  let glowClass = "";
  let borderClass = "";

  switch(effect.type) {
    case 'ON_DRAW':
      title = "抽牌特效";
      colorClass = "text-blue-400";
      glowClass = "shadow-blue-500/30";
      borderClass = "border-blue-500/30";
      break;
    case 'ON_REVEAL':
      title = "揭示特效";
      colorClass = "text-amber-400";
      glowClass = "shadow-amber-500/30";
      borderClass = "border-amber-500/30";
      break;
    case 'STATUS_PHASE':
      title = "被动特效";
      colorClass = "text-emerald-400";
      glowClass = "shadow-emerald-500/30";
      borderClass = "border-emerald-500/30";
      break;
    case 'INSTANT':
      title = "插入特效";
      colorClass = "text-purple-400";
      glowClass = "shadow-purple-500/30";
      borderClass = "border-purple-500/30";
      break;
    case 'MARK_TRIGGER':
      title = "印记触发";
      colorClass = "text-red-400";
      glowClass = "shadow-red-500/30";
      borderClass = "border-red-500/30";
      break;
    case 'ON_DISCARD':
      title = "弃置特效";
      colorClass = "text-stone-400";
      glowClass = "shadow-stone-500/30";
      borderClass = "border-stone-500/30";
      break;
    default:
      title = "特效触发";
      colorClass = "text-white";
      glowClass = "shadow-white/30";
      borderClass = "border-white/30";
  }

  // Positioning and Animation Logic based on Player ID
  // P1 moved to left-[280px] to clear the sidebar (w-64 = 256px + padding)
  const positionClass = isP1 ? "left-[280px] items-start" : "right-6 items-end";
  
  // Animation Origin: P1 slides from left (-20), P2 slides from right (20)
  const startTranslate = isP1 ? '-translate-x-20' : 'translate-x-20';
  const animClass = animate 
    ? 'scale-100 opacity-100 translate-x-0' 
    : `scale-75 opacity-0 ${startTranslate}`;

  // Player Badge Style
  const playerLabel = isP1 ? "PLAYER 1" : "PLAYER 2";
  const playerBadgeColor = isP1 ? "text-sky-400 border-sky-900/50" : "text-rose-400 border-rose-900/50";
  const playerBadgeBg = "bg-stone-900";

  return (
    // Container aligns to left or right based on player ID
    <div className={`fixed top-1/2 -translate-y-1/2 z-[100] flex flex-col justify-center pointer-events-auto ${positionClass}`}>
      
      <div 
        className={`
            relative bg-stone-950/95 backdrop-blur-xl border ${borderClass} 
            p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 
            transform transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)
            ${animClass}
            max-w-[280px]
        `}
      >
         {/* Player Identity Badge */}
         <div className={`absolute -top-3 ${isP1 ? 'left-4' : 'right-4'} px-3 py-0.5 rounded-full ${playerBadgeBg} border ${playerBadgeColor} shadow-md z-20 flex items-center gap-1.5`}>
             <div className={`w-1.5 h-1.5 rounded-full ${isP1 ? 'bg-sky-500' : 'bg-rose-500'} animate-pulse`}></div>
             <span className={`text-[10px] font-black tracking-widest ${isP1 ? 'text-sky-400' : 'text-rose-400'}`}>{playerLabel}</span>
         </div>

         {/* Glow effect behind panel */}
         <div className={`absolute inset-0 rounded-2xl ${glowClass} opacity-20 pointer-events-none`}></div>

        <h2 className={`text-2xl font-serif font-black tracking-widest drop-shadow-md ${colorClass} mt-1`}>
          {title}
        </h2>

        {/* Card Preview */}
        <div className={`relative transform transition-transform duration-700 ${animate ? 'scale-100' : 'scale-90'}`}>
           <div className="pointer-events-none scale-[0.85] origin-center shadow-xl">
              <CardComponent card={effect.card} isFaceUp={true} />
           </div>
        </div>

        <div className="text-stone-300 font-serif text-xs leading-relaxed bg-stone-900/60 px-4 py-3 rounded border border-stone-800 w-full text-center max-h-[120px] overflow-y-auto">
           {effect.description || "处理特效中..."}
        </div>

        <button 
           onClick={onDismiss}
           className={`
              w-full py-2 rounded-lg font-bold text-sm tracking-widest backdrop-blur transition-all 
              hover:brightness-125 active:scale-95 border border-white/10
              shadow-lg
              ${colorClass === 'text-white' ? 'bg-stone-700 text-stone-200' : ''}
              ${effect.type === 'ON_DRAW' ? 'bg-blue-900 text-blue-100' : ''}
              ${effect.type === 'ON_REVEAL' ? 'bg-amber-900 text-amber-100' : ''}
              ${effect.type === 'INSTANT' ? 'bg-purple-900 text-purple-100' : ''}
              ${effect.type === 'STATUS_PHASE' ? 'bg-emerald-900 text-emerald-100' : ''}
              ${effect.type === 'ON_DISCARD' ? 'bg-stone-800 text-stone-300' : ''}
              ${effect.type === 'MARK_TRIGGER' ? 'bg-red-900 text-red-100' : ''}
           `}
        >
           继续
        </button>

      </div>
    </div>
  );
};
