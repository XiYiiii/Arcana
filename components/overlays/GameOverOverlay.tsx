import React from 'react';

export const GameOverOverlay = ({ result, onRestart }: { result: string, onRestart: () => void }) => {
    return (
         <div className="fixed inset-0 z-[300] bg-black/95 flex flex-col items-center justify-center animate-in fade-in duration-1000">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
            <h1 className="text-8xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-700 mb-4 drop-shadow-lg">游戏结束</h1>
            <div className="text-3xl text-stone-300 mb-12 text-center font-light max-w-2xl leading-relaxed">
               {result}
            </div>
            <button onClick={onRestart} className="px-12 py-5 bg-stone-800 hover:bg-stone-700 border border-stone-600 hover:border-stone-400 rounded-xl text-2xl font-bold text-white shadow-2xl transition-all hover:scale-105">
               再次挑战
            </button>
         </div>
    );
}