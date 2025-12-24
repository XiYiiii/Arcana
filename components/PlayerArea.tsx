
import React, { useState } from 'react';
import { Card, GamePhase, InstantWindow, PlayerState } from '../types';
import { CardComponent } from './CardComponent';
import { DeckPile } from './piles/DeckPile';
import { DiscardPile } from './piles/DiscardPile';
import { TreasureVault } from './piles/TreasureVault';

interface PlayerAreaProps {
  player: PlayerState;
  isOpponent?: boolean;
  phase: GamePhase;
  selectedCardId: string | null;
  mustDiscard: boolean;
  canSet: boolean;
  canInstant: boolean;
  isResolving: boolean;
  instantWindow: InstantWindow;
  onSelect: (c: Card) => void;
  onInstant: (id: string) => void;
  onViewDiscard?: () => void;
  onViewDeck?: () => void;
  onViewVault?: () => void;
  enableControls?: boolean;
  hideHand?: boolean; 
  // Debug Info Prop
  debugInfo?: Record<string, { score: number, reasons: string[] }>;
}

export const PlayerArea: React.FC<PlayerAreaProps> = ({ 
    player, 
    isOpponent, 
    phase, 
    selectedCardId, 
    mustDiscard, 
    canSet, 
    canInstant, 
    isResolving, 
    instantWindow, 
    onSelect, 
    onInstant, 
    onViewDiscard, 
    onViewDeck, 
    onViewVault,
    enableControls,
    hideHand = false,
    debugInfo
}) => {
   // Default behavior: If it's an opponent (online/remote), disable controls. 
   const showActions = enableControls !== undefined ? enableControls : !isOpponent;

   const isDiscardPhase = phase === GamePhase.DISCARD;
   // 修改：弃牌阶段只要手牌数 >= 2，就允许交互（弃牌）
   const allowInteraction = phase === GamePhase.SET || instantWindow !== InstantWindow.NONE || (isDiscardPhase && player.hand.length >= 2);
   
   const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
   const [hoveredQuestId, setHoveredQuestId] = useState<string | null>(null);

   const isSetButtonActive = showActions && phase === GamePhase.SET && selectedCardId && canSet;
   const isInstantButtonActive = showActions && selectedCardId && canInstant;

   return (
      <div className={`flex-1 flex flex-col w-full ${isOpponent ? 'pt-4' : 'pb-6'} relative transition-all duration-500 z-30`}>
         
         <div className={`absolute ${isOpponent ? 'top-4' : 'bottom-8'} left-1/2 -translate-x-1/2 z-[60] flex items-center gap-4`}>
             
             {showActions && (
                <div className="flex flex-row items-center mr-4 animate-in fade-in slide-in-from-right-4 gap-3">
                    <button 
                        onClick={isSetButtonActive ? () => {} : undefined} 
                        disabled={!isSetButtonActive}
                        className={`
                            px-4 py-2 rounded-lg text-[10px] font-bold border transition-all duration-300 shadow-md select-none flex items-center justify-center whitespace-nowrap min-w-[80px]
                            ${isSetButtonActive 
                                ? 'bg-emerald-700 text-emerald-100 border-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-105 cursor-default' 
                                : 'bg-stone-900/60 text-stone-600 border-stone-800 opacity-50 grayscale'
                            }
                        `}
                    >
                        {isSetButtonActive ? '▼ 确认盖牌' : '盖牌'}
                    </button>

                    <button 
                        onClick={() => selectedCardId && onInstant(selectedCardId)} 
                        disabled={!isInstantButtonActive}
                        className={`
                            px-4 py-2 rounded-lg text-[10px] font-bold border transition-all duration-300 shadow-md whitespace-nowrap min-w-[80px] flex items-center justify-center gap-1
                            ${isInstantButtonActive 
                                ? 'bg-purple-800 hover:bg-purple-700 text-purple-100 border-purple-600 shadow-[0_0_15px_rgba(147,51,234,0.5)] hover:scale-105 cursor-pointer pointer-events-auto' 
                                : 'bg-stone-900/60 text-stone-600 border-stone-800 opacity-50 grayscale cursor-not-allowed'
                            }
                        `}
                    >
                        <span>✨</span> 插入
                    </button>
                </div>
             )}

             <div className="flex items-center gap-4 bg-stone-950/90 px-6 py-2 rounded-full border border-stone-700 backdrop-blur-md shadow-2xl pointer-events-none">
                 <div className="flex items-center gap-2">
                     <div className={`w-8 h-8 rounded border ${isOpponent ? 'border-stone-600 bg-stone-800' : 'border-stone-500 bg-stone-800'} flex items-center justify-center shadow-lg`}>
                         <span className="text-sm grayscale opacity-70">{isOpponent ? '👤' : '🧙‍♂️'}</span>
                     </div>
                     <div className="flex flex-col">
                         <span className={`font-serif font-bold text-sm leading-none ${isOpponent ? 'text-stone-400' : 'text-stone-300'} drop-shadow-md`}>
                             {player.name}
                         </span>
                     </div>
                 </div>
                 
                 <div className="w-px h-6 bg-stone-700/50"></div>

                 <div className="flex gap-3">
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs">❤️</span>
                        <span className={`font-serif font-bold ${player.hp <= 5 ? 'text-red-400' : 'text-emerald-400'}`}>{player.hp}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs">⚔️</span>
                        <span className="font-serif font-bold text-blue-400">{player.atk}</span>
                    </div>
                 </div>

                 <div className="flex gap-1">
                   {player.immunityNextTurn && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="下回免疫"></span>}
                   {player.immunityThisTurn && <span className="w-2 h-2 rounded-full bg-amber-600 border border-amber-400 shadow-glow" title="免疫中"></span>}
                   {player.isReversed && <span className="w-2 h-2 rounded-full bg-purple-500" title="被反转"></span>}
                   {player.isInvalidated && <span className="w-2 h-2 rounded-full bg-stone-500" title="被无效"></span>}
                   {mustDiscard && isDiscardPhase && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" title="需弃牌"></span>}
                 </div>

                 {player.quests.length > 0 && (
                     <>
                         <div className="w-px h-6 bg-stone-700/50 mx-1"></div>
                         <div className="flex gap-2 pointer-events-auto">
                             {player.quests.map(q => (
                                 <div 
                                    key={q.id} 
                                    className="flex flex-col items-center bg-stone-900 px-2 py-1 rounded border border-yellow-600 shadow-md relative group cursor-help transition-transform hover:scale-110"
                                    onMouseEnter={() => setHoveredQuestId(q.id)}
                                    onMouseLeave={() => setHoveredQuestId(null)}
                                 >
                                     <span className="text-[9px] text-yellow-500 font-black leading-none mb-1 max-w-[60px] truncate">{q.name}</span>
                                     <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden border border-stone-700">
                                         <div className="h-full bg-gradient-to-r from-yellow-700 to-yellow-400 transition-all duration-500" style={{ width: `${Math.min(100, (q.progress / q.target) * 100)}%` }}></div>
                                     </div>
                                     
                                     {hoveredQuestId === q.id && (
                                         <div className={`absolute left-1/2 -translate-x-1/2 ${isOpponent ? 'top-full mt-3' : 'bottom-full mb-3'} w-48 bg-stone-950/95 p-3 rounded-lg border border-yellow-600/50 shadow-[0_0_20px_rgba(0,0,0,0.8)] z-[100] text-left pointer-events-none backdrop-blur-xl`}>
                                             <div className="text-[11px] font-bold text-yellow-500 mb-1 flex justify-between items-center">
                                                 <span>{q.name}</span>
                                                 <span className="text-[9px] bg-stone-800 px-1.5 rounded text-yellow-200/70">{Math.round((q.progress / q.target) * 100)}%</span>
                                             </div>
                                             <div className="text-[10px] text-stone-300 mb-2 leading-tight border-b border-stone-800 pb-2">{q.description}</div>
                                             <div className="text-[9px] text-stone-500 font-mono flex justify-between">
                                                 <span>当前: {q.progress}</span>
                                                 <span>目标: {q.target}</span>
                                             </div>
                                             <div className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 border-8 border-transparent ${isOpponent ? 'bottom-full border-b-stone-950/95 -mb-[1px]' : 'top-full border-t-stone-950/95 -mt-[1px]'}`}></div>
                                         </div>
                                     )}
                                 </div>
                             ))}
                         </div>
                     </>
                 )}
             </div>
         </div>

         <div className={`flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-12 flex ${isOpponent ? 'items-start' : 'items-end'} justify-between relative`}>
            <div className={`flex flex-col ${isOpponent ? 'mt-8' : 'mb-24'} z-10`}>
                {isOpponent ? (
                    <div className="relative">
                        <DeckPile count={player.deck.length} isOpponent onClick={onViewDeck} />
                        <TreasureVault position="bottom" onClick={onViewVault} />
                    </div>
                ) : (
                    <DiscardPile cards={player.discardPile} onClick={onViewDiscard} />
                )}
            </div>

            <div className={`relative flex-1 flex justify-center ${isOpponent ? 'mt-[-40px]' : 'mb-16'}`}>
                <div className={`relative flex justify-center items-end h-[220px] w-full max-w-3xl`}>
                {player.hand.length === 0 && phase === GamePhase.SET && (
                    <div className="text-stone-600 text-xs font-serif italic flex items-center bg-stone-900/30 px-6 py-2 rounded-full border border-stone-800 self-center">
                        无手牌
                    </div>
                )}
                
                {player.hand.map((card: Card, idx: number) => {
                    const total = player.hand.length;
                    const middle = (total - 1) / 2;
                    const offset = idx - middle;
                    
                    const rotateDeg = offset * 5; 
                    const translateY = Math.abs(offset) * 6 + (isOpponent ? 80 : -40); 
                    
                    const isHovered = hoveredIndex === idx;
                    const isSelectedCard = selectedCardId === card.instanceId;
                    const tooltipSide = idx > middle ? 'left' : 'right';
                    const shouldShowFace = !hideHand; 
                    const debugData = debugInfo ? debugInfo[card.instanceId] : null;

                    const style: React.CSSProperties = {
                        transform: isHovered || isSelectedCard
                            ? `translateY(${isOpponent ? '6rem' : '-6rem'}) scale(1.15) rotate(0deg)` 
                            : `translateY(${translateY}px) rotate(${rotateDeg}deg) scale(0.6)`, 
                        zIndex: isHovered || isSelectedCard ? 50 : idx + 20, 
                        marginLeft: idx === 0 ? 0 : '-85px', 
                        transformOrigin: isOpponent ? 'center top' : 'center bottom',
                    };

                    const drawAnimClass = isOpponent ? 'animate-draw-p2' : 'animate-draw-p1';

                    return (
                        <div 
                            key={card.instanceId} 
                            style={style}
                            className={`transition-all duration-300 ease-out origin-bottom ${drawAnimClass}`}
                            onMouseEnter={() => setHoveredIndex(idx)}
                            onMouseLeave={() => setHoveredIndex(null)}
                        >
                            {debugData && (
                                <div className={`absolute ${isOpponent ? '-bottom-16' : '-top-12'} left-1/2 -translate-x-1/2 bg-black/90 text-white text-[10px] p-2 rounded z-[60] w-32 pointer-events-auto group/debug border border-yellow-600/50 shadow-lg scale-90`}>
                                    <div className="font-bold text-center text-yellow-400 text-sm flex flex-col">
                                        <span>得分: {debugData.score.toFixed(0)}</span>
                                    </div>
                                    <div className="hidden group-hover/debug:block absolute bottom-full left-1/2 -translate-x-1/2 bg-stone-950 border border-stone-600 p-2 rounded w-48 mb-2 z-[70] shadow-xl">
                                        <div className="text-[10px] font-bold text-stone-400 mb-1 border-b border-stone-800 pb-1">评分详情</div>
                                        {debugData.reasons.map((r, i) => (
                                            <div key={i} className="text-[9px] text-stone-300 flex justify-between">
                                                <span>{r.split(':')[0]}</span>
                                                <span className={r.includes('+') ? 'text-emerald-400' : 'text-red-400'}>{r.split(':')[1]}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-black/90"></div>
                                </div>
                            )}

                            <CardComponent 
                                card={card} 
                                isFaceUp={shouldShowFace} 
                                label={isOpponent ? "P2" : "P1"}
                                isSelected={isSelectedCard}
                                disabled={isResolving || !allowInteraction} 
                                onClick={() => onSelect(card)}
                                tooltipSide={tooltipSide}
                            />
                        </div>
                    );
                })}
                </div>
            </div>

            <div className={`flex flex-col ${isOpponent ? 'mt-8' : 'mb-24'} z-10`}>
                {isOpponent ? (
                    <DiscardPile cards={player.discardPile} isOpponent onClick={onViewDiscard} />
                ) : (
                    <div className="relative">
                        <TreasureVault position="top" onClick={onViewVault} />
                        <DeckPile count={player.deck.length} onClick={onViewDeck} />
                    </div>
                )}
            </div>

         </div>
      </div>
   );
}
