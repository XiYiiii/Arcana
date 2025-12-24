
import React, { useState } from 'react';
import { CardSuit } from '../../../types';
import { SUIT_ICONS, SUIT_COLORS } from '../../../constants';

interface AdventureLevel {
    id: string;
    title: string;
    description: string;
    bossName: string;
    difficulty: '简单' | '普通' | '困难' | '英雄';
    hp: number;
}

interface Chapter {
    id: CardSuit;
    name: string;
    icon: string;
    colorClass: string;
    levels: AdventureLevel[];
}

const generateLevels = (chapterIdx: number, chapterName: string): AdventureLevel[] => {
    const titles = ["遗迹守卫", "森林低语", "迷雾潜伏者", "元素回响", "古老试炼", "精英卫队", "终局之敌"];
    return Array.from({ length: 7 }, (_, i) => ({
        id: `${chapterIdx}-${i + 1}`,
        title: `${chapterName}之试炼 ${i + 1}`,
        description: `这是${chapterName}章节的第 ${i + 1} 场战斗。迎接来自深渊的挑战。`,
        bossName: `${chapterName}${titles[i]}`,
        difficulty: i < 3 ? '简单' : i < 6 ? '普通' : '困难',
        hp: 30 + (chapterIdx * 5) + (i * 2)
    }));
};

const CHAPTERS: Chapter[] = [
    { id: CardSuit.CUPS, name: '圣杯', icon: SUIT_ICONS.CUPS, colorClass: 'text-pink-500', levels: generateLevels(1, '圣杯') },
    { id: CardSuit.WANDS, name: '权杖', icon: SUIT_ICONS.WANDS, colorClass: 'text-orange-500', levels: generateLevels(2, '权杖') },
    { id: CardSuit.SWORDS, name: '宝剑', icon: SUIT_ICONS.SWORDS, colorClass: 'text-cyan-400', levels: generateLevels(3, '宝剑') },
    { id: CardSuit.PENTACLES, name: '星币', icon: SUIT_ICONS.PENTACLES, colorClass: 'text-yellow-500', levels: generateLevels(4, '星币') },
];

interface AdventureMapScreenProps {
    onStartLevel: (levelId: string, initialHp: number) => void;
    onBack: () => void;
}

export const AdventureMapScreen: React.FC<AdventureMapScreenProps> = ({ onStartLevel, onBack }) => {
    const [selectedChapterId, setSelectedChapterId] = useState<CardSuit>(CardSuit.CUPS);
    const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);

    const activeChapter = CHAPTERS.find(c => c.id === selectedChapterId)!;
    const selectedLevel = activeChapter.levels.find(l => l.id === selectedLevelId);

    return (
        <div className="fixed inset-0 bg-stone-950 flex flex-col font-sans text-stone-200 overflow-hidden">
            {/* 背景效果 - 随章节颜色变化 */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none"></div>
            <div className={`absolute inset-0 transition-all duration-1000 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] opacity-30
                ${selectedChapterId === CardSuit.CUPS ? 'from-pink-900/20' : 
                  selectedChapterId === CardSuit.WANDS ? 'from-orange-900/20' : 
                  selectedChapterId === CardSuit.SWORDS ? 'from-cyan-900/20' : 'from-yellow-900/20'} via-stone-950 to-stone-950 pointer-events-none`}>
            </div>

            {/* Header */}
            <div className="h-16 bg-stone-900/80 border-b border-white/5 backdrop-blur-md flex items-center justify-between px-8 z-10 shadow-lg">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-stone-400 hover:text-stone-200 flex items-center gap-1 transition-colors">
                        <span>❮</span> 返回菜单
                    </button>
                    <div className="w-px h-6 bg-stone-700"></div>
                    <h1 className="text-xl font-serif font-black tracking-widest text-white uppercase italic">Adventure Chronicle</h1>
                </div>
                <div className="flex items-center gap-2 text-stone-500 text-xs font-mono">
                    <span className="text-amber-600 animate-pulse">●</span> MAP STATUS: SYNCHRONIZED
                </div>
            </div>

            {/* Main Layout */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* 1. Leftmost: Chapter Select (Suit Orbs) */}
                <div className="w-20 bg-stone-950/80 border-r border-white/5 flex flex-col items-center py-8 gap-8 z-20">
                    {CHAPTERS.map(chapter => {
                        const isActive = selectedChapterId === chapter.id;
                        return (
                            <button
                                key={chapter.id}
                                onClick={() => {
                                    setSelectedChapterId(chapter.id);
                                    setSelectedLevelId(null);
                                }}
                                className={`w-12 h-12 rounded-full border-2 transition-all duration-500 flex items-center justify-center text-2xl relative group
                                    ${isActive 
                                        ? `bg-stone-800 border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)] scale-110` 
                                        : `bg-transparent border-white/5 grayscale opacity-40 hover:opacity-100 hover:scale-105 hover:grayscale-0`}`}
                                title={chapter.name}
                            >
                                <span className={chapter.colorClass}>{chapter.icon}</span>
                                {isActive && (
                                    <div className={`absolute -right-2 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-white animate-in slide-in-from-left-1`}></div>
                                )}
                                {/* Tooltip label */}
                                <div className="absolute left-full ml-4 px-2 py-1 bg-stone-800 rounded border border-stone-700 text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    {chapter.name}章节
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* 2. Middle: Level Scroll List */}
                <div className="flex-1 flex flex-col p-10 overflow-y-auto custom-scrollbar bg-black/10">
                    <div className="mb-10 animate-in fade-in slide-in-from-left-4 duration-500">
                        <span className={`text-[10px] font-black tracking-[0.3em] uppercase opacity-60 ${activeChapter.colorClass}`}>Chapter Selection</span>
                        <h2 className="text-5xl font-serif font-black text-white tracking-widest mt-1">
                            {activeChapter.name}<span className="text-stone-600 ml-4 font-light text-3xl">之章</span>
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 gap-4 max-w-2xl">
                        {activeChapter.levels.map((level) => {
                            const isSelected = selectedLevelId === level.id;
                            const levelNum = level.id.split('-')[1];
                            return (
                                <button
                                    key={level.id}
                                    onClick={() => setSelectedLevelId(level.id)}
                                    className={`group relative flex items-center gap-6 p-5 rounded-xl border transition-all duration-300 transform 
                                        ${isSelected 
                                            ? 'bg-white/5 border-white/40 shadow-[0_10px_30px_rgba(0,0,0,0.5)] translate-x-4' 
                                            : 'bg-stone-900/20 border-white/5 hover:border-white/20 hover:bg-white/5 hover:translate-x-2'}`}
                                >
                                    {/* Level Number Index */}
                                    <div className={`w-10 h-10 rounded border flex items-center justify-center font-serif font-bold text-lg transition-all 
                                        ${isSelected ? 'bg-white text-stone-950 border-white' : 'bg-stone-800 text-stone-500 border-stone-700 group-hover:border-stone-500'}`}>
                                        {levelNum}
                                    </div>

                                    {/* Level Info */}
                                    <div className="flex flex-col items-start">
                                        <span className={`font-serif font-bold text-lg tracking-wider transition-colors ${isSelected ? 'text-white' : 'text-stone-400 group-hover:text-stone-200'}`}>
                                            {level.title}
                                        </span>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border ${
                                                level.difficulty === '简单' ? 'border-emerald-500/30 text-emerald-500' :
                                                level.difficulty === '普通' ? 'border-blue-500/30 text-blue-500' :
                                                'border-orange-500/30 text-orange-500'
                                            }`}>
                                                {level.difficulty}
                                            </span>
                                            <span className="text-[10px] text-stone-600 font-mono italic">Guardian: {level.bossName}</span>
                                        </div>
                                    </div>

                                    {/* Selection Glow */}
                                    {isSelected && <div className="absolute right-6 w-2 h-2 rounded-full bg-white animate-ping"></div>}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 3. Right: Level Detail Panel (Floating Style) */}
                <div className="w-1/3 bg-stone-900/20 border-l border-white/5 flex flex-col p-10 relative z-10 backdrop-blur-sm">
                    {selectedLevel ? (
                        <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-8 duration-500">
                            {/* Boss Avatar Display */}
                            <div className="w-full aspect-[4/5] bg-stone-950 rounded-2xl border border-white/10 flex flex-col items-center justify-center relative overflow-hidden group shadow-2xl mb-8">
                                <div className="absolute inset-0 bg-gradient-to-br from-stone-800/10 to-stone-950"></div>
                                <div className="text-9xl grayscale opacity-10 group-hover:opacity-20 transition-all duration-700 transform group-hover:scale-110">👤</div>
                                
                                {/* Boss Name Overlay */}
                                <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-stone-950 to-transparent flex flex-col items-center">
                                    <span className="text-amber-600 text-[10px] uppercase tracking-[0.4em] font-black mb-1">Guardian of Arcana</span>
                                    <span className="text-2xl font-serif font-black text-white tracking-[0.2em]">{selectedLevel.bossName}</span>
                                </div>

                                {/* Corner Decos */}
                                <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-white/20"></div>
                                <div className="absolute top-4 right-4 w-4 h-4 border-t border-r border-white/20"></div>
                                <div className="absolute bottom-4 left-4 w-4 h-4 border-b border-l border-white/20"></div>
                                <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-white/20"></div>
                            </div>

                            <h3 className="text-2xl font-serif font-bold text-white tracking-widest mb-4 flex items-center gap-3">
                                <span className={activeChapter.colorClass}>{activeChapter.icon}</span>
                                {selectedLevel.title}
                            </h3>
                            
                            <p className="text-stone-400 text-sm leading-relaxed font-serif italic mb-8 border-l-2 border-stone-800 pl-4 py-1">
                                "{selectedLevel.description}"
                            </p>

                            <div className="space-y-4 mb-10">
                                <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                                    <span className="text-stone-500 font-bold tracking-widest uppercase">Chapter</span>
                                    <span className={`font-bold ${activeChapter.colorClass}`}>{activeChapter.name}章</span>
                                </div>
                                <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                                    <span className="text-stone-500 font-bold tracking-widest uppercase">Target HP</span>
                                    <span className="text-emerald-500 font-serif font-bold text-lg">{selectedLevel.hp}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                                    <span className="text-stone-500 font-bold tracking-widest uppercase">Ruleset</span>
                                    <span className="text-stone-300">Standard PVE</span>
                                </div>
                            </div>

                            <div className="mt-auto">
                                <button 
                                    onClick={() => onStartLevel(selectedLevel.id, selectedLevel.hp)}
                                    className="w-full py-5 bg-white text-stone-950 rounded-xl font-serif font-black text-xl tracking-[0.3em] uppercase transition-all transform hover:scale-105 active:scale-95 shadow-[0_20px_50px_rgba(255,255,255,0.1)] hover:bg-stone-200"
                                >
                                    Start Duel
                                </button>
                                <p className="text-center text-[9px] text-stone-600 mt-4 tracking-widest uppercase">Finalize deck before entering</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-20">
                            <div className="text-8xl mb-6">🧭</div>
                            <h4 className="text-xl font-serif italic tracking-widest">Select a Node</h4>
                            <p className="text-xs mt-2">Choose a destination on the arcana map</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="h-10 bg-stone-900 border-t border-white/5 flex items-center justify-between px-8 text-[9px] text-stone-600 font-mono tracking-widest uppercase">
                <span>© PROJECT ARCANA - Chapter {activeChapter.name}</span>
                <div className="flex gap-4">
                    <span>Region: {activeChapter.id}</span>
                    <span>Nodes: 7/7 Active</span>
                </div>
            </div>
        </div>
    );
};
