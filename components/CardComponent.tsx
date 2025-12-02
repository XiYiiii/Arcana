import React, { useState, useRef } from 'react';
import { Card, CardDefinition } from '../types';
import { SUIT_COLORS, SUIT_ICONS, KEYWORD_DESCRIPTIONS, KEYWORD_DISPLAY_NAMES } from '../constants';
import { CARD_DEFINITIONS } from '../data/cards';

interface CardComponentProps {
  card: Card | null;
  isFaceUp: boolean;
  onClick?: () => void;
  isSelected?: boolean;
  disabled?: boolean;
  label?: string;
  tooltipSide?: 'left' | 'right';
}

// Helper to resolve mark to card definition
const getCardFromMark = (mark: string): CardDefinition | null => {
    // Special mappings for simplified mark names or cross-suit marks
    const map: Record<string, string> = {
        'mark-death': 'wands-death', // Usually from Wands Death
        'mark-lovers': 'wands-lovers',
        'mark-justice': 'wands-justice',
        'mark-sun': 'wands-sun',
        'mark-disabled': '', 
        'mark-pentacles-fool': 'pentacles-fool',
    };

    if (map[mark]) return CARD_DEFINITIONS.find(c => c.id === map[mark]) || null;

    // Default: try removing "mark-" and finding ID
    const coreId = mark.replace(/^mark-/, '');
    
    // Exact match
    let found = CARD_DEFINITIONS.find(c => c.id === coreId);
    if (found) return found;

    // Suffix match (e.g. mark-cups-fool -> cups-fool)
    found = CARD_DEFINITIONS.find(c => c.id === coreId);
    if (found) return found;
    
    return null;
}

export const CardComponent: React.FC<CardComponentProps> = ({ 
  card, 
  isFaceUp, 
  onClick, 
  isSelected,
  disabled,
  label,
  tooltipSide = 'right' 
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const wrapperClasses = "relative w-48 h-[216px] flex-shrink-0 transition-all duration-300 select-none group perspective-1000";
  
  const stateClasses = isSelected 
    ? "ring-2 ring-amber-500/80 z-30 shadow-glow" 
    : ""; 

  const handleMouseEnter = () => {
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  if (!card) {
    return (
      <div className={`${wrapperClasses} h-[192px] w-[132px] border-2 border-dashed border-stone-700 rounded-xl flex items-center justify-center bg-stone-800/50 text-stone-500 backdrop-blur-sm`}>
        <span className="text-[10px] font-serif tracking-widest opacity-50">空</span>
      </div>
    );
  }

  const suitColor = SUIT_COLORS[card.suit] || "text-stone-400";
  const suitIcon = SUIT_ICONS[card.suit] || "?";

  // Render text looking for [Keyword] pattern
  const renderTextContent = (text: string) => {
     // Split by [ANYTHING]
     const parts = text.split(/(\[.*?\])/g);
     return parts.map((part, i) => {
        if (part.startsWith('[') && part.endsWith(']')) {
           const content = part.slice(1, -1);
           // Check if it's a known keyword or specific term we want to highlight
           if (Object.values(KEYWORD_DISPLAY_NAMES).includes(content) || ['标记', '场地', '任务'].includes(content)) {
               return <span key={i} className="font-extrabold text-amber-200 border-b-[1px] border-amber-500/40 mx-[1px]">{content}</span>;
           }
           // Fallback for unknown bracketed text
           return <span key={i} className="font-bold text-stone-300">{content}</span>;
        }
        return <span key={i}>{part}</span>;
     });
  };

  // Parse and structure the description
  const renderDescription = (text: string) => {
     // Split by tags like 【打出】, 【标记】, etc.
     const blocks = text.split(/(?=【)/g);

     return blocks.map((block, i) => {
        // Match structure: 【Tag】 Content
        const match = block.match(/^(【.*?】)([\s\S]*)/);
        
        if (match) {
           const tagRaw = match[1];
           let content = match[2].trim(); 
           
           let tagNode: React.ReactNode;

           // Check for 【插入(Phase)】 format
           const instantMatch = tagRaw.match(/^【插入[\(（](.*?)[\)）]】$/);
           
           if (instantMatch) {
               const phase = instantMatch[1];
               tagNode = (
                   <div className="flex flex-col items-center justify-center mr-1 shrink-0 select-none bg-purple-900 rounded-sm px-0.5 py-[1px] border border-purple-700 shadow-sm min-w-[24px] mt-[1px]">
                       <span className="font-black text-purple-100 text-[9px] leading-none">插入</span>
                       <span className="text-[6px] font-bold text-purple-200 leading-none mt-[1px] tracking-tighter whitespace-nowrap scale-90">({phase})</span>
                   </div>
               );
           } else {
               // Standard tags
               const tagName = tagRaw.replace(/[【】]/g, '');
               
               // Helper to extract quoted name from start of content e.g. “Name”: Description
               const extractSubText = (c: string) => {
                   const m = c.match(/^[“"「]([^”"」]+)[”"」][:：]?\s*(.*)/s);
                   if (m) {
                       return { subText: m[1], remainingContent: m[2] };
                   }
                   return { subText: null, remainingContent: c };
               };

               if (tagName === '场地') {
                    const { subText, remainingContent } = extractSubText(content);
                    if (subText) content = remainingContent;
                    
                    tagNode = (
                        <div className="flex flex-col items-center justify-center mr-1 shrink-0 select-none bg-emerald-950 rounded-sm px-0.5 py-[1px] border border-emerald-800 shadow-sm min-w-[24px] mt-[1px]">
                            <span className="font-black text-emerald-200 text-[9px] leading-none">场地</span>
                            {subText && <span className="text-[6px] font-bold text-emerald-300 leading-none mt-[1px] tracking-tighter whitespace-nowrap scale-90 max-w-[52px] truncate">{subText}</span>}
                        </div>
                    );
               } else if (tagName === '任务') {
                    const { subText, remainingContent } = extractSubText(content);
                    if (subText) content = remainingContent;

                    tagNode = (
                        <div className="flex flex-col items-center justify-center mr-1 shrink-0 select-none bg-amber-950 rounded-sm px-0.5 py-[1px] border border-amber-800 shadow-sm min-w-[24px] mt-[1px]">
                            <span className="font-black text-amber-200 text-[9px] leading-none">任务</span>
                            {subText && <span className="text-[6px] font-bold text-amber-300 leading-none mt-[1px] tracking-tighter whitespace-nowrap scale-90 max-w-[52px] truncate">{subText}</span>}
                        </div>
                    );
               } else if (tagName === '标记') {
                    const { subText, remainingContent } = extractSubText(content);
                    if (subText) content = remainingContent;

                    tagNode = (
                        <div className="flex flex-col items-center justify-center mr-1 shrink-0 select-none bg-slate-800 rounded-sm px-0.5 py-[1px] border border-slate-600 shadow-sm min-w-[24px] mt-[1px]">
                            <span className="font-black text-slate-200 text-[9px] leading-none">标记</span>
                            {subText && <span className="text-[6px] font-bold text-slate-300 leading-none mt-[1px] tracking-tighter whitespace-nowrap scale-90 max-w-[52px] truncate">{subText}</span>}
                        </div>
                    );
               } else {
                   const tagColors: Record<string, string> = {
                       '打出': 'text-amber-100 bg-amber-900 border-amber-800',
                       '抽到': 'text-blue-100 bg-blue-900 border-blue-800',
                       '弃置': 'text-stone-200 bg-stone-700 border-stone-600',
                       '被动': 'text-emerald-100 bg-emerald-900 border-emerald-800',
                   };
                   const styleClass = tagColors[tagName] || 'text-stone-200 bg-stone-700 border-stone-600';
                   
                   tagNode = (
                     <span className={`font-black shrink-0 mr-1 select-none text-[9px] px-0.5 py-[0px] rounded border shadow-sm mt-[1px] ${styleClass}`}>
                        {tagName}
                     </span>
                   );
               }
           }

           return (
              <div key={i} className="flex items-start mb-1 last:mb-0">
                 {tagNode}
                 <span className="text-stone-300 text-[10px] leading-tight flex-1 whitespace-pre-wrap pt-[1px] font-medium break-all">{renderTextContent(content)}</span>
              </div>
           );
        }
        
        // Fallback for text without tags
        if (!block.trim()) return null;
        return <div key={i} className="mb-1 last:mb-0 text-stone-400 text-[9px] italic leading-tight whitespace-pre-wrap border-l border-stone-600 pl-1.5 break-all">{renderTextContent(block)}</div>;
     });
  };

  const keywordsToShow = card.keywords && card.keywords.length > 0 ? card.keywords : [];
  const marksToShow = card.marks || [];
  
  // Right Side Tooltip (Keywords)
  const keywordTooltip = showTooltip && keywordsToShow.length > 0 ? (
     <div 
        className={`absolute top-0 z-[9999] pointer-events-none flex flex-col gap-1.5 w-48 bg-stone-950/95 text-stone-200 p-2.5 rounded-lg shadow-[0_0_30px_rgba(0,0,0,0.9)] border border-stone-500/50 backdrop-blur-xl
           ${tooltipSide === 'right' ? 'left-[105%]' : 'right-[105%]'}`}
     >
        {/* Arrow */}
        <div className={`absolute top-6 w-0 h-0 border-[6px] border-transparent
             ${tooltipSide === 'right' 
                ? 'right-full border-r-stone-500/50 mr-[1px]' // Arrow on left pointing left
                : 'left-full border-l-stone-500/50 ml-[1px]' // Arrow on right pointing right
             }`}
        ></div>
        
        {keywordsToShow.map(k => (
           <div key={k} className="mb-0 pb-0">
              <span className="text-amber-500 font-serif font-bold text-[10px] block mb-0.5 flex items-center gap-1.5">
                  <span className="w-0.5 h-2.5 bg-amber-600 rounded-full"></span>
                  {KEYWORD_DISPLAY_NAMES[k]}
              </span>
              <span className="text-stone-400 text-[9px] leading-normal block pl-2 opacity-90">{KEYWORD_DESCRIPTIONS[k]}</span>
           </div>
        ))}
     </div>
  ) : null;

  const marksTooltip = showTooltip && marksToShow.length > 0 ? (
     <div 
        className={`absolute top-0 z-[9999] pointer-events-none flex flex-col gap-2 w-48 bg-stone-950/95 text-stone-200 p-2 rounded-lg shadow-[0_0_30px_rgba(0,0,0,0.9)] border border-stone-500/50 backdrop-blur-xl
           right-[105%] mr-1`} // Force Left Side
     >
        {/* Arrow pointing right */}
        <div className="absolute top-6 left-full w-0 h-0 border-[6px] border-transparent border-l-stone-500/50 ml-[1px]"></div>
        
        <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest border-b border-stone-800 pb-1 mb-1 flex items-center gap-1">
            <span>🔹</span> 标记源
        </div>
        
        {marksToShow.map((m, i) => {
             const sourceCard = getCardFromMark(m);
             return (
                 <div key={i} className="flex flex-col gap-1 mb-2 last:mb-0">
                     <span className="text-[9px] text-amber-200/80 font-mono bg-stone-900 px-1 py-0.5 rounded w-fit border border-stone-800">{m.replace('mark-', '').toUpperCase()}</span>
                     {sourceCard ? (
                         <div className="scale-75 origin-top-left w-[133%] border border-stone-700/50 rounded-lg overflow-hidden shadow-lg">
                             <CardComponent card={{...sourceCard, instanceId: `preview-mark-${m}`, marks: [], description: sourceCard.description || ''}} isFaceUp={true} disabled />
                         </div>
                     ) : (
                         <span className="text-[10px] italic text-stone-600 pl-1">未知来源</span>
                     )}
                 </div>
             )
        })}
     </div>
  ) : null;

  const innerContent = isFaceUp ? (
    <div className={`relative w-full h-full rounded-lg overflow-hidden flex flex-col shadow-card transition-transform duration-300 bg-stone-800
      ${disabled && !card.isLocked ? 'opacity-80 grayscale-[0.8] cursor-not-allowed' : 'cursor-pointer'}
      ${card.isLocked ? 'cursor-not-allowed' : ''}
    `}>
      
      {/* Border Overlay */}
      <div className={`absolute inset-0 border-[2px] rounded-lg pointer-events-none z-20 ${card.isLocked ? 'border-red-500/70' : isSelected ? 'border-amber-500' : 'border-stone-600'}`}></div>
      
      {/* LOCK OVERLAY */}
      {card.isLocked && (
          <div className="absolute inset-0 bg-stone-950/40 z-30 flex items-center justify-center backdrop-blur-[0px]">
              <div className="absolute top-2 right-2 text-2xl drop-shadow-md animate-bounce">🔒</div>
              <div className="absolute inset-0 border-2 border-red-500/30 rounded-lg pointer-events-none"></div>
              {/* Crossed Chains Effect */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-2 bg-stone-900/80 rotate-45 border-y border-stone-600"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-2 bg-stone-900/80 -rotate-45 border-y border-stone-600"></div>
          </div>
      )}

      {/* Header */}
      <div className="relative bg-stone-900 text-stone-200 p-1.5 pb-2 z-10 flex justify-between items-start border-b border-stone-700 shadow-md">
        <div className="flex flex-col w-full pr-6">
            <span className="font-serif font-bold text-[9px] text-stone-500 tracking-widest uppercase leading-none mb-0.5">No. {card.rank}</span>
            <span className="font-serif font-bold text-xs leading-tight truncate tracking-wide text-stone-100">{card.name}</span>
        </div>
        <div className="absolute top-0 right-0 w-10 h-10 bg-stone-800 rounded-bl-xl border-b border-l border-stone-700 flex items-center justify-center shadow-lg">
            <span className={`text-xl leading-none drop-shadow-md ${suitColor}`}>{suitIcon}</span>
        </div>
      </div>

      {/* Body Background Icon */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.08] text-[8rem] pointer-events-none z-0 text-stone-200">
        {suitIcon}
      </div>

      {/* Description Area */}
      <div className="relative flex-grow p-2 z-10 overflow-y-auto overflow-x-hidden pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-stone-600 [&::-webkit-scrollbar-thumb]:rounded-full">
        {renderDescription(card.description)}
      </div>
      
      {/* Footer Tags */}
      <div className="p-1.5 pt-0 flex flex-wrap gap-0.5 justify-end z-10 min-h-[20px] items-end">
         {card.isTreasure && <span className="bg-amber-900 text-amber-100 text-[8px] px-1.5 py-[1px] rounded border border-amber-700 font-bold shadow-sm">宝藏</span>}
         {card.canSet === false && <span className="bg-red-900 text-red-200 text-[8px] px-1.5 py-[1px] rounded border border-red-800 font-bold shadow-sm">被动</span>}
         {card.marks && card.marks.map((m, i) => (
            <span key={i} className="bg-stone-700 text-stone-300 text-[8px] px-1.5 py-[1px] rounded border border-stone-600 shadow-sm flex items-center gap-1">
               <span className="w-0.5 h-0.5 bg-white rounded-full"></span>
               {m.replace('mark-', '').replace(/cups-|wands-/g, '').toUpperCase().slice(0,4)}
            </span>
         ))}
      </div>

      {label && <div className="absolute bottom-0.5 left-1 text-[7px] font-bold text-stone-600 z-10 uppercase tracking-widest">{label}</div>}
    </div>
  ) : (
    <div className={`w-full h-full rounded-lg border-[2px] border-stone-700 bg-stone-900 shadow-card relative overflow-hidden group ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
       {/* Card Back Pattern */}
       <div className="absolute inset-0 bg-stone-900"></div>
       <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
       
       <div className="absolute inset-3 border border-stone-700/30 rounded flex items-center justify-center">
           <div className="w-14 h-14 rounded-full border border-stone-700/50 flex items-center justify-center bg-stone-800/40 shadow-[0_0_20px_rgba(0,0,0,0.5)] group-hover:shadow-[0_0_20px_rgba(100,100,100,0.2)] transition-shadow duration-500">
               <div className="text-2xl filter drop-shadow-[0_0_2px_rgba(255,255,255,0.2)] opacity-60 grayscale">🔮</div>
           </div>
       </div>
       
       {/* Mark Indicators on Back */}
       <div className="absolute top-2 right-2 flex flex-col gap-1 z-20">
          {card.marks && card.marks.map((m, i) => (
            <div key={i} className="bg-amber-600 text-stone-900 text-[8px] w-3 h-3 flex items-center justify-center rounded-full font-black border border-amber-800 shadow-lg animate-bounce" style={{animationDelay: `${i*0.1}s`}}>!</div>
         ))}
       </div>
       
       {/* Lock Indicator on Back */}
       {card.isLocked && (
          <div className="absolute inset-0 bg-stone-950/40 z-30 flex items-center justify-center backdrop-blur-[0px]">
               <span className="text-2xl drop-shadow-md">🔒</span>
               <div className="absolute inset-0 border-2 border-red-500/30 rounded-lg pointer-events-none"></div>
          </div>
       )}
       
       {label && <div className="absolute bottom-2 right-2 text-[8px] font-bold text-stone-600/50 z-20">{label}</div>}
    </div>
  );

  return (
    <div 
      ref={cardRef}
      onClick={!disabled && !card.isLocked ? onClick : undefined} 
      className={`${wrapperClasses} ${stateClasses}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {innerContent}
      {keywordTooltip}
      {marksTooltip}
    </div>
  );
};