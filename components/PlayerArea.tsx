
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
  enableControls?: boolean; // New prop to explicitly control button visibility
  isHandHidden?: boolean; // New prop to force render cards face down (for privacy)
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
    isHandHidden = false
}) => {
   // Default behavior: If it's an opponent (online/remote), disable controls. 
   // In local game, we will explicitly pass enableControls=true for both.
   const showActions = enableControls !== undefined ? enableControls : !isOpponent;

   const isDiscardPhase = phase === GamePhase.DISCARD;
   const allowInteraction = phase === GamePhase.SET || instantWindow !== InstantWindow.NONE || (phase === GamePhase.DISCARD && mustDiscard);
   const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
   const [hoveredQuestId, setHoveredQuestId] = useState<string | null>(null);

   // Button Validity Logic - Use showActions instead of !isOpponent
   const isSetButtonActive = showActions && phase === GamePhase.SET && selectedCardId && canSet;
   const isInstantButtonActive = showActions && selectedCardId && canInstant;

   return (
      <div className={`flex-1 flex flex-col w-full ${isOpponent ? 'pt-4' : 'pb-6'} relative transition-all duration-500 z-30`}>
         
         {/* Player Info Panel & Action Buttons - Increased Z-Index to 60 */}
         <div className={`absolute ${isOpponent ? 'top-4' : 'bottom-8'} left-1/2 -translate-x-1/2 z-[60] flex items-center gap-4`}>
             
             {/* Action Buttons - Visible if showActions is true */}
             {showActions && (
                <div className="flex flex-row items-center mr-4 animate-in fade-in slide-in-from-right-4 gap-3">
                    {/* Set Card Indicator/Button */}
                    <button 
                        onClick={isSetButtonActive ? () => {} : undefined} // Button is mostly visual indicator for Set, actual trigger handles in parent or auto, but let's keep consistent style
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

                    {/* Instant Use Button */}
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

             {/* Status Bar */}
             <div className="flex items-center gap-4 bg-stone-950/90 px-6 py-2 rounded-full border border-stone-700 backdrop-blur-md shadow-2xl pointer-events-none">
                 {/* Avatar / Name */}
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
                 
                 {/* Divider */}
                 <div className="w-px h-6 bg-stone-700/50"></div>

                 {/* Stats Row */}
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

                 {/* Status Effects */}
                 <div className="flex gap-1">
                   {player.immunityNextTurn && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="下回免疫"></span>}
                   {player.immunityThisTurn && <span className="w-2 h-2 rounded-full bg-amber-600 border border-amber-400 shadow-glow" title="免疫中"></span>}
                   {player.isReversed && <span className="w-2 h-2 rounded-full bg-purple-500" title="被反转"></span>}
                   {player.isInvalidated && <span className="w-2 h-2 rounded-full bg-stone-500" title="被无效"></span>}
                   {mustDiscard && isDiscardPhase && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" title="需弃牌"></span>}
                 </div>

                 {/* Quests */}
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
                                     
                                     {/* Quest Tooltip */}
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
                                             {/* Arrow */}
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

         {/* Main Playing Area Row: Piles + Hand */}
         <div className={`flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-12 flex ${isOpponent ? 'items-start' : 'items-end'} justify-between relative`}>
            
            {/* Left Pile Column */}
            <div className={`flex flex-col ${isOpponent ? 'mt-8' : 'mb-24'} z-10`}>
                {isOpponent ? (
                    // Opponent Left: Deck (P2)
                    <div className="relative">
                        <DeckPile count={player.deck.length} isOpponent onClick={onViewDeck} />
                        <TreasureVault position="bottom" onClick={onViewVault} />
                    </div>
                ) : (
                    // Player Left: Discard
                    <DiscardPile cards={player.discardPile} onClick={onViewDiscard} />
                )}
            </div>

            {/* Center Hand Area */}
            <div className={`relative flex-1 flex justify-center ${isOpponent ? 'mt-[-40px]' : 'mb-16'}`}>
                {/* Card Container - Fan Layout */}
                <div className={`
                    relative flex justify-center items-end h-[220px] w-full max-w-3xl
                `}>
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
                    // Modified TranslateY for P1 (isOpponent=false) to move it up ~10-15px
                    // Original: -5rem. New: -5.8rem.
                    const translateY = Math.abs(offset) * 6 + (isOpponent ? 80 : -40); 
                    
                    const isHovered = hoveredIndex === idx;
                    const isSelectedCard = selectedCardId === card.instanceId;
                    
                    const tooltipSide = idx > middle ? 'left' : 'right';
                    
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
                            <CardComponent 
                                card={card} 
                                isFaceUp={!isHandHidden} 
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

            {/* Right Pile Column */}
            <div className={`flex flex-col ${isOpponent ? 'mt-8' : 'mb-24'} z-10`}>
                {isOpponent ? (
                    // Opponent Right: Discard
                    <DiscardPile cards={player.discardPile} isOpponent onClick={onViewDiscard} />
                ) : (
                    // Player Right: Deck (P1)
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
