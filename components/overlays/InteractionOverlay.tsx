

import React, { useState } from 'react';
import { InteractionRequest } from '../../types';
import { CardComponent } from '../CardComponent';

export const InteractionOverlay = ({ request }: { request: InteractionRequest }) => {
  const [numberVal, setNumberVal] = useState(request.min || 1);
  const [hoveredOptionIndex, setHoveredOptionIndex] = useState<number | null>(null);

  if (!request) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
       {/* Transparent backdrop for clicks outside? No, interactions are blocking usually. 
           But to 'mimic effect trigger' and 'not cover battlefield', we remove the dark backdrop.
           We add a small invisible blocker for clicks if needed, or just let it float.
           Usually interactions require attention. We'll use a very faint backdrop to signal modal but keep visibility.
       */}
       <div className="absolute inset-0 bg-black/5 pointer-events-auto"></div>

       <div className="bg-stone-950/95 border border-yellow-600/30 p-6 rounded-2xl max-w-2xl w-full shadow-2xl text-center flex flex-col max-h-[70vh] relative pointer-events-auto animate-in zoom-in-95 fade-in duration-300 backdrop-blur-md">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none rounded-2xl"></div>
          
          <h2 className="text-xl font-serif font-black text-yellow-500 mb-2 drop-shadow-sm tracking-wide">{request.title}</h2>
          <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-yellow-600/50 to-transparent mx-auto mb-4"></div>
          
          <p className="text-stone-300 mb-6 text-sm leading-relaxed whitespace-pre-line">{request.description}</p>
          
          {request.inputType === 'NUMBER_INPUT' && (
             <div className="flex flex-col items-center gap-4 z-10">
                <div className="flex items-center gap-4 bg-stone-800/50 p-2 rounded-xl border border-stone-700">
                   <button onClick={() => setNumberVal(Math.max(request.min || 0, numberVal - 1))} className="w-10 h-10 bg-stone-700 hover:bg-stone-600 rounded-lg text-xl text-white transition-colors">-</button>
                   <span className="text-4xl font-black text-white w-20 font-serif tabular-nums">{numberVal}</span>
                   <button onClick={() => setNumberVal(Math.min(request.max || 99, numberVal + 1))} className="w-10 h-10 bg-stone-700 hover:bg-stone-600 rounded-lg text-xl text-white transition-colors">+</button>
                </div>
                <button 
                  onClick={() => request.onConfirm && request.onConfirm(numberVal)}
                  className="mt-2 px-8 py-2 bg-yellow-600 hover:bg-yellow-500 text-black rounded-lg font-bold text-lg shadow-lg transition-transform hover:scale-105 active:scale-95"
                >
                   确认
                </button>
             </div>
          )}
          
          {request.inputType === 'CARD_SELECT' && (
             <div className="flex flex-col items-center gap-4 w-full overflow-hidden z-10 flex-1 min-h-0">
                <div className="flex flex-wrap justify-center gap-2 overflow-y-auto p-2 w-full scrollbar-thin scrollbar-thumb-yellow-600/50 max-h-[300px]">
                   {request.cardsToSelect?.map((card) => (
                      <div key={card.instanceId} className="transform hover:scale-105 transition-transform scale-90">
                        <CardComponent 
                            card={card}
                            isFaceUp={true}
                            onClick={() => request.onCardSelect && request.onCardSelect(card)}
                        />
                      </div>
                   ))}
                </div>
                {request.options && (
                  <div className="flex gap-4 mt-2 border-t border-white/5 pt-3 w-full justify-center">
                      {request.options.map((opt, idx) => (
                        <button key={idx} onClick={opt.action} className="px-6 py-1.5 bg-stone-700 hover:bg-stone-600 rounded text-stone-200 font-bold border border-stone-600 text-xs">{opt.label}</button>
                      ))}
                  </div>
                )}
             </div>
          )}

          {request.inputType !== 'NUMBER_INPUT' && request.inputType !== 'CARD_SELECT' && (
            <div className="flex gap-4 justify-center flex-wrap z-10 relative">
               {request.options && request.options.map((opt, idx) => (
                  <div key={idx} className="relative group/opt">
                      <button 
                        onClick={opt.action}
                        onMouseEnter={() => setHoveredOptionIndex(idx)}
                        onMouseLeave={() => setHoveredOptionIndex(null)}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 border-b-4 border-indigo-900 active:border-b-0 active:translate-y-1 text-white rounded-lg font-bold text-sm transition-all min-w-[120px]"
                      >
                         {opt.label}
                      </button>

                      {/* Hover Card Tooltip */}
                      {opt.hoverCard && hoveredOptionIndex === idx && (
                          <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in zoom-in duration-200 pointer-events-none">
                              <div className="scale-75 origin-bottom shadow-2xl">
                                  <CardComponent card={opt.hoverCard} isFaceUp={true} />
                              </div>
                              {/* Arrow */}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-2 border-8 border-transparent border-t-stone-800"></div>
                          </div>
                      )}
                  </div>
               ))}
            </div>
          )}
       </div>
    </div>
  );
};