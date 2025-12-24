
import React from 'react';

interface StartScreenProps {
  onStartGame: () => void;
  onStartOnlineGame: () => void;
  onOpenDeckBuilder: () => void;
  onStartPVE: () => void; 
  onStartAdventure: () => void; // New callback
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStartGame, onStartOnlineGame, onOpenDeckBuilder, onStartPVE, onStartAdventure }) => {
  return (
    <div className="fixed inset-0 bg-stone-950 flex flex-col items-center justify-center z-50 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 animate-pulse"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-900/20 via-stone-950/80 to-stone-950 pointer-events-none"></div>
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-1000">
        <div className="text-center space-y-4">
            <div className="w-24 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto mb-6"></div>
            <h1 className="text-7xl md:text-9xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-500 to-amber-800 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)] tracking-widest">
                ARCANA
            </h1>
            <h2 className="text-xl md:text-2xl text-stone-400 font-serif tracking-[0.5em] uppercase opacity-80">
                Duel of Fates
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto mt-6"></div>
        </div>

        <div className="flex flex-col gap-4 w-full max-w-xs">
          
          {/* Adventure Mode */}
          <button 
            onClick={onStartAdventure}
            className="group relative px-8 py-4 bg-stone-900 border border-purple-700/50 rounded-lg overflow-hidden transition-all hover:scale-105 hover:border-purple-500 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-900/0 via-purple-900/20 to-purple-900/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            <div className="relative flex flex-col items-center z-10">
                <span className="font-serif font-bold text-xl text-purple-100 tracking-widest group-hover:text-white">
                  🧭 冒险模式
                </span>
                <span className="text-[10px] text-purple-400/60 uppercase tracking-widest mt-1">Adventure Saga</span>
            </div>
          </button>

          {/* Local Multiplayer */}
          <button 
            onClick={onStartGame}
            className="group relative px-8 py-3 bg-stone-900 border border-amber-700/50 rounded-lg overflow-hidden transition-all hover:scale-105 hover:border-amber-500"
          >
            <div className="relative flex flex-col items-center z-10">
                <span className="font-serif font-bold text-lg text-amber-100 tracking-widest group-hover:text-white">
                  本地多人
                </span>
                <span className="text-[10px] text-amber-500/60 uppercase tracking-widest mt-0.5">Local PVP</span>
            </div>
          </button>

          {/* Single Player (PVE) */}
          <button 
            onClick={onStartPVE}
            className="relative px-8 py-3 bg-stone-900 border border-stone-600 rounded-lg flex flex-col items-center overflow-hidden transition-all hover:scale-105 hover:border-stone-400 group"
          >
             <div className="relative flex flex-col items-center z-10">
                 <span className="font-serif font-bold text-lg text-stone-300 tracking-widest group-hover:text-stone-100 transition-colors">人机对战</span>
                 <span className="text-[9px] text-stone-500 uppercase tracking-widest mt-0.5 group-hover:text-stone-400">PVE Practice</span>
             </div>
          </button>

          {/* Online Multiplayer */}
          <button 
            onClick={onStartOnlineGame}
            className="group relative px-8 py-3 bg-stone-900/80 border border-stone-700 rounded-lg flex flex-col items-center overflow-hidden transition-all hover:border-indigo-500 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]"
          >
             <div className="relative flex flex-col items-center z-10">
                <span className="font-serif font-bold text-lg text-stone-300 tracking-widest group-hover:text-indigo-200 transition-colors">联机模式</span>
                <span className="text-[9px] text-stone-600 uppercase tracking-widest mt-0.5 group-hover:text-indigo-400">Online PvP</span>
             </div>
          </button>

          <div className="w-full h-px bg-stone-800/50 my-2"></div>

          <button 
            onClick={onOpenDeckBuilder}
            className="px-8 py-3 bg-transparent border border-stone-700 rounded-lg text-stone-400 font-serif tracking-widest hover:bg-stone-800 hover:text-stone-200 hover:border-stone-500 transition-all text-sm"
          >
            开局设置
          </button>
        </div>
      </div>

      <div className="absolute bottom-8 text-stone-600 text-xs font-mono">
        PROJECT BLANK v0.4.0
      </div>
    </div>
  );
};
