import React, { useState } from 'react';
import { InteractionRequest } from '../../types';
import { CardComponent } from '../CardComponent';

export const InteractionOverlay = ({ request }: { request: InteractionRequest }) => {
  const [numberVal, setNumberVal] = useState(request.min || 1);

  if (!request) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center overflow-auto p-4 animate-in fade-in duration-200">
       <div className="bg-stone-900 border-2 border-yellow-600/50 p-8 rounded-2xl max-w-4xl w-full shadow-[0_0_50px_rgba(234,179,8,0.15)] text-center flex flex-col max-h-[90vh] relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>
          
          <h2 className="text-3xl font-serif font-black text-yellow-500 mb-2 drop-shadow-sm tracking-wide">{request.title}</h2>
          <div className="w-32 h-1 bg-gradient-to-r from-transparent via-yellow-600 to-transparent mx-auto mb-6"></div>
          
          <p className="text-stone-300 mb-8 text-lg leading-relaxed">{request.description}</p>
          
          {request.inputType === 'NUMBER_INPUT' && (
             <div className="flex flex-col items-center gap-6 z-10">
                <div className="flex items-center gap-6 bg-stone-800/50 p-4 rounded-xl border border-stone-700">
                   <button onClick={() => setNumberVal(Math.max(request.min || 0, numberVal - 1))} className="w-14 h-14 bg-stone-700 hover:bg-stone-600 rounded-lg text-3xl text-white transition-colors">-</button>
                   <span className="text-6xl font-black text-white w-32 font-serif tabular-nums">{numberVal}</span>
                   <button onClick={() => setNumberVal(Math.min(request.max || 99, numberVal + 1))} className="w-14 h-14 bg-stone-700 hover:bg-stone-600 rounded-lg text-3xl text-white transition-colors">+</button>
                </div>
                <button 
                  onClick={() => request.onConfirm && request.onConfirm(numberVal)}
                  className="mt-4 px-12 py-4 bg-yellow-600 hover:bg-yellow-500 text-black rounded-xl font-bold text-xl shadow-lg transition-transform hover:scale-105 active:scale-95"
                >
                   确认
                </button>
             </div>
          )}
          
          {request.inputType === 'CARD_SELECT' && (
             <div className="flex flex-col items-center gap-4 w-full overflow-hidden z-10 flex-1 min-h-0">
                <div className="flex flex-wrap justify-center gap-4 overflow-y-auto p-4 w-full scrollbar-thin scrollbar-thumb-yellow-600/50">
                   {request.cardsToSelect?.map((card) => (
                      <div key={card.instanceId} className="transform hover:scale-105 transition-transform">
                        <CardComponent 
                            card={card}
                            isFaceUp={true}
                            onClick={() => request.onCardSelect && request.onCardSelect(card)}
                        />
                      </div>
                   ))}
                </div>
                {request.options && (
                  <div className="flex gap-4 mt-4 border-t border-white/10 pt-4 w-full justify-center">
                      {request.options.map((opt, idx) => (
                        <button key={idx} onClick={opt.action} className="px-8 py-2 bg-stone-700 hover:bg-stone-600 rounded text-white font-bold border border-stone-500">{opt.label}</button>
                      ))}
                  </div>
                )}
             </div>
          )}

          {request.inputType !== 'NUMBER_INPUT' && request.inputType !== 'CARD_SELECT' && (
            <div className="flex gap-6 justify-center flex-wrap z-10">
               {request.options && request.options.map((opt, idx) => (
                  <button 
                    key={idx}
                    onClick={opt.action}
                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 border-b-4 border-indigo-900 active:border-b-0 active:translate-y-1 text-white rounded-xl font-bold text-lg transition-all min-w-[150px]"
                  >
                     {opt.label}
                  </button>
               ))}
            </div>
          )}
       </div>
    </div>
  );
};