
import React, { useState } from 'react';
import { CARD_DEFINITIONS } from '../data/cards';
import { CardComponent } from './CardComponent';
import { CardDefinition } from '../types';

interface GameLogSidebarProps {
  logs: string[];
}

const getLogStyle = (text: string) => {
  if (text.includes('伤害')) return { icon: '💥', border: 'border-red-900/50', bg: 'bg-red-950/30' };
  if (text.includes('恢复') || text.includes('治疗')) return { icon: '💚', border: 'border-emerald-900/50', bg: 'bg-emerald-950/30' };
  if (text.includes('抽牌') || text.includes('抽')) return { icon: '🎴', border: 'border-blue-900/50', bg: 'bg-blue-950/30' };
  if (text.includes('弃置') || text.includes('丢弃')) return { icon: '🗑️', border: 'border-stone-700/50', bg: 'bg-stone-900/30' };
  if (text.includes('锁定')) return { icon: '🔒', border: 'border-amber-900/50', bg: 'bg-amber-950/30' };
  if (text.includes('无效')) return { icon: '🚫', border: 'border-stone-500/50', bg: 'bg-stone-800/30' };
  if (text.includes('变化')) return { icon: '✨', border: 'border-purple-900/50', bg: 'bg-purple-950/30' };
  if (text.includes('任务')) return { icon: '📜', border: 'border-yellow-700/50', bg: 'bg-yellow-900/20' };
  if (text.includes('场地')) return { icon: '🏟️', border: 'border-indigo-900/50', bg: 'bg-indigo-950/30' };
  if (text.includes('夺取') || text.includes('获得')) return { icon: '🎁', border: 'border-orange-900/50', bg: 'bg-orange-950/30' };
  if (text.includes('打出')) return { icon: '⚔️', border: 'border-stone-600', bg: 'bg-stone-800' };
  return { icon: '📝', border: 'border-stone-800', bg: 'bg-stone-900/50' };
};

export const GameLogSidebar: React.FC<GameLogSidebarProps> = ({ logs }) => {
  const [hoveredCard, setHoveredCard] = useState<CardDefinition | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });

  const handleMouseEnter = (e: React.MouseEvent, cardName: string) => {
      // Clean name: remove surrounding brackets if somehow still there
      const cleanName = cardName.replace(/[\[\]]/g, '');
      const def = CARD_DEFINITIONS.find(c => c.name === cleanName);
      if (def) {
          const rect = (e.target as HTMLElement).getBoundingClientRect();
          setHoveredCard(def);
          // Position to the right of the sidebar
          setTooltipPos({ top: rect.top, left: 260 }); 
      }
  };

  const handleMouseLeave = () => {
      setHoveredCard(null);
  };

  const formatLogText = (text: string) => {
    // Regex matches [Card Name]
    const parts = text.split(/(\[.*?\])/g);
    
    return parts.map((part, i) => {
      // Check if it's a card reference in brackets
      if (part.startsWith('[') && part.endsWith(']')) {
        const content = part.slice(1, -1);
        
        // Check if content matches a known card name (or partial match for robust logging)
        const isCard = CARD_DEFINITIONS.some(c => c.name === content);
        
        if (isCard) {
            return (
                <span 
                    key={i} 
                    className="text-amber-400 font-bold mx-0.5 cursor-help border-b border-amber-500/30 hover:bg-amber-900/50 px-0.5 rounded transition-colors"
                    onMouseEnter={(e) => handleMouseEnter(e, content)}
                    onMouseLeave={handleMouseLeave}
                >
                    {part}
                </span>
            );
        }
        
        // Highlight keywords or other bracketed terms
        return <span key={i} className="text-stone-300 font-bold mx-0.5">{part}</span>;
      }
      
      // Formatting for player names
      if (part.match(/Player \d|P\d|对手|己方/)) {
        const isP1 = part.includes('1') || part === '己方'; // Simple assumption for color
        return <span key={i} className={`font-bold mx-0.5 ${isP1 ? 'text-sky-400' : 'text-rose-400'}`}>{part}</span>;
      }
      
      return <span key={i} className="text-stone-400">{part}</span>;
    });
  };

  return (
    <div className="w-64 h-full bg-stone-950 border-r border-stone-800 flex flex-col z-40 shadow-2xl shrink-0 relative">
       {/* Header */}
       <div className="p-4 border-b border-stone-800 bg-stone-900/80 backdrop-blur text-center shadow-md z-10">
          <h3 className="text-stone-300 font-serif font-bold tracking-widest text-sm uppercase flex items-center justify-center gap-2">
             <span>📜</span> 战斗记录
          </h3>
       </div>

       {/* Texture Overlay */}
       <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] pointer-events-none"></div>

       {/* Logs Container */}
       <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-2 scrollbar-thin scrollbar-thumb-stone-700 scrollbar-track-transparent mask-image-gradient-b">
          {logs.length === 0 && (
              <div className="text-center text-stone-600 text-xs italic mt-10">暂无记录</div>
          )}
          
          {logs.map((log, index) => {
             const style = getLogStyle(log);
             return (
               <div 
                  key={`log-${index}`} 
                  className={`relative group flex items-start gap-2 p-2.5 rounded-lg border ${style.border} ${style.bg} transition-all hover:brightness-125 hover:border-stone-500 animate-in slide-in-from-left-2 duration-300`}
               >
                  <div className="mt-0.5 text-base shrink-0 select-none grayscale group-hover:grayscale-0 transition-all">{style.icon}</div>
                  <div className="text-[10px] leading-relaxed font-medium break-words">
                      {formatLogText(log)}
                  </div>
                  
                  {/* Turn indicator decoration */}
                  {log.includes('回合开始') && (
                      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>
                  )}
               </div>
             );
          })}
          
          {/* Spacer at bottom */}
          <div className="h-4"></div>
       </div>

       {/* Hover Tooltip - Floating outside the sidebar */}
       {hoveredCard && (
           <div 
               className="fixed z-[9999] pointer-events-none animate-in fade-in zoom-in-95 duration-200"
               style={{ top: Math.max(20, Math.min(window.innerHeight - 300, tooltipPos.top - 80)), left: tooltipPos.left }}
           >
               <div className="bg-stone-900 border border-amber-600/50 p-2 rounded-lg shadow-2xl relative">
                   {/* Triangle pointing left */}
                   <div className="absolute top-10 -left-2 w-0 h-0 border-t-[8px] border-t-transparent border-r-[8px] border-r-amber-600/50 border-b-[8px] border-b-transparent"></div>
                   
                   <div className="w-48 h-[216px] scale-90 origin-top-left">
                       <CardComponent 
                           card={{ ...hoveredCard, instanceId: 'preview', marks: [], description: hoveredCard.description || "" }} 
                           isFaceUp={true} 
                           disabled 
                       />
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};
