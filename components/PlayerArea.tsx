
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
}

export const PlayerArea: React.FC<PlayerAreaProps> = ({ 
    player, isOpponent, phase, selectedCardId, mustDiscard, canSet, canInstant, isResolving, instantWindow, onSelect, onInstant, onViewDiscard, onViewDeck, onViewVault
}) => {
   const isDiscardPhase = phase === GamePhase.DISCARD;
   const allowInteraction = phase === GamePhase.SET || instantWindow !== InstantWindow.NONE || (phase === GamePhase.DISCARD && mustDiscard);
   const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
   const [hoveredQuestId, setHoveredQuestId] = useState<string | null>(null);

   return (
      <div className={`flex-1 flex flex-col w-full ${isOpponent ? 'pt-4' : 'pb-6'} relative transition-all duration-500 z-30`}>
         
         {/* Player Info Panel */}
         <div className={`absolute ${isOpponent ? 'top-4' : 'bottom-8'} left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 bg-stone-950/80 px-6 py-2 rounded-full border border-stone-800/50 backdrop-blur-md shadow-xl pointer-events-none`}>
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
                                className="flex flex-col items-center bg-stone-800 px-1.5 py-0.5 rounded border border-yellow-700/40 relative group cursor-help"
                                onMouseEnter={() => setHoveredQuestId(q.id)}
                                onMouseLeave={() => setHoveredQuestId(null)}
                             >
                                 <span className="text-[8px] text-yellow-500 font-bold leading-none mb-0.5 max-w-[50px] truncate">{q.name}</span>
                                 <div className="w-full h-1 bg-stone-700 rounded-full overflow-hidden">
                                     <div className="h-full bg-yellow-500 transition-all duration-500" style={{ width: `${(q.progress / q.target) * 100}%` }}></div>
                                 </div>
                                 
                                 {/* Quest Tooltip */}
                                 {hoveredQuestId === q.id && (
                                     <div className={`absolute left-1/2 -translate-x-1/2 ${isOpponent ? 'top-full mt-2' : 'bottom-full mb-2'} w-40 bg-stone-900/95 p-2 rounded border border-yellow-700/50 shadow-xl z-50 text-left`}>
                                         <div className="text-[10px] font-bold text-yellow-500 mb-1">{q.name}</div>
                                         <div className="text-[9px] text-stone-300 mb-1">{q.description}</div>
                                         <div className="text-[8px] text-stone-500 font-mono">进度: {q.progress} / {q.target}</div>
                                     </div>
                                 )}
                             </div>
                         ))}
                     </div>
                 </>
             )}
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
                 {/* Action Buttons Overlay */}
                {selectedCardId && (instantWindow !== InstantWindow.NONE || phase === GamePhase.SET) && (
                <div className={`absolute ${isOpponent ? 'bottom-[-60px]' : 'top-[-80px]'} z-50 flex flex-col items-center animate-bounce pointer-events-none w-full`}>
                    {phase === GamePhase.SET && (
                        canSet 
                        ? <div className="bg-emerald-700 text-emerald-100 text-[10px] font-bold px-3 py-1 rounded-full shadow-lg mb-1 border border-emerald-600">▼ 确认盖牌</div> 
                        : <div className="bg-red-800 text-red-200 text-[10px] font-bold px-3 py-1 rounded-full shadow-lg mb-1 border border-red-700">🚫 无法盖置</div>
                    )}
                    {canInstant && (
                        <button onClick={() => onInstant(selectedCardId)} className="bg-purple-800 hover:bg-purple-700 text-purple-100 px-3 py-1 rounded-full text-[10px] font-bold shadow-[0_0_10px_rgba(147,51,234,0.3)] border border-purple-600 transition-all hover:scale-105 pointer-events-auto">
                            ✨ 使用插入
                        </button>
                    )}
                </div>
                )}

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
                    const translateY = Math.abs(offset) * 6 + (isOpponent ? 80 : 0);
                    const isHovered = hoveredIndex === idx;
                    const isSelectedCard = selectedCardId === card.instanceId;
                    
                    const tooltipSide = idx > middle ? 'left' : 'right';
                    
                    const style: React.CSSProperties = {
                        transform: isHovered || isSelectedCard
                            ? `translateY(${isOpponent ? '6rem' : '-5rem'}) scale(1.15) rotate(0deg)` 
                            : `translateY(${translateY}px) rotate(${rotateDeg}deg) scale(0.55)`, 
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
                                isFaceUp={true} 
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
