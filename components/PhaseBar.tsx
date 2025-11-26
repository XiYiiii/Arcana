import React from 'react';
import { GamePhase } from '../types';
import { PHASE_DESCRIPTIONS } from '../constants';

interface PhaseBarProps {
  currentPhase: GamePhase;
  turn: number;
}

const PHASE_NAMES = {
  [GamePhase.DRAW]: "抽牌",
  [GamePhase.SET]: "盖牌",
  [GamePhase.REVEAL]: "结算",
  [GamePhase.DISCARD]: "弃牌",
  [GamePhase.GAME_OVER]: "结束",
};

export const PhaseBar: React.FC<PhaseBarProps> = ({ currentPhase, turn }) => {
  const phases = [GamePhase.DRAW, GamePhase.SET, GamePhase.REVEAL, GamePhase.DISCARD];

  return (
    <div className="w-full bg-stone-900/80 backdrop-blur-md border-b border-white/10 p-4 flex flex-col sticky top-0 z-40 shadow-lg">
      <div className="flex items-center w-full max-w-5xl mb-2">
        <h1 className="text-xl font-serif font-bold text-white tracking-widest drop-shadow-md mr-8">
            回合 <span className="text-yellow-500 text-2xl">{turn}</span>
        </h1>
        <div className="flex space-x-1 bg-stone-950/50 p-1 rounded-full border border-white/5">
          {phases.map((phase) => (
            <div
              key={phase}
              className={`px-4 py-1.5 rounded-full text-[10px] font-bold tracking-wider transition-all duration-300 ${
                currentPhase === phase
                  ? 'bg-indigo-600 text-white shadow-glow scale-105'
                  : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              {PHASE_NAMES[phase]}
            </div>
          ))}
        </div>
      </div>
      <p className="text-stone-400 text-xs font-medium max-w-3xl opacity-80 pl-1">{PHASE_DESCRIPTIONS[currentPhase]}</p>
    </div>
  );
};