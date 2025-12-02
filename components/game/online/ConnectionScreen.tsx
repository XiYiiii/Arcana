import React, { useState } from 'react';

interface ConnectionScreenProps {
    onCreateGame: () => void;
    onJoinGame: (hostId: string) => void;
    onBack: () => void;
    isConnecting: boolean;
    hostId: string | null; // If we are hosting, this is our ID
    error: string | null;
}

export const ConnectionScreen: React.FC<ConnectionScreenProps> = ({ 
    onCreateGame, 
    onJoinGame, 
    onBack, 
    isConnecting, 
    hostId, 
    error 
}) => {
    const [view, setView] = useState<'MAIN' | 'HOST' | 'JOIN'>('MAIN');
    const [targetId, setTargetId] = useState('');

    const handleCreate = () => {
        setView('HOST');
        onCreateGame();
    };

    const handleJoin = () => {
        if (!targetId.trim()) return;
        onJoinGame(targetId.trim());
    };

    return (
        <div className="fixed inset-0 z-50 bg-stone-950 flex items-center justify-center font-sans text-stone-200">
            {/* Background */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-stone-950/80 to-stone-950 pointer-events-none"></div>

            <div className="relative z-10 w-full max-w-md p-8 bg-stone-900/80 border border-indigo-500/30 rounded-2xl shadow-[0_0_50px_rgba(79,70,229,0.15)] backdrop-blur-xl animate-in fade-in zoom-in duration-500">
                
                {/* Header */}
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-serif font-black text-indigo-400 tracking-widest drop-shadow-md mb-2">
                        量子链接
                    </h2>
                    <div className="w-12 h-1 bg-indigo-600 mx-auto rounded-full"></div>
                </div>

                {error && (
                    <div className="mb-6 p-3 bg-red-900/30 border border-red-800/50 rounded-lg text-red-300 text-xs text-center animate-pulse">
                        ⚠️ {error}
                    </div>
                )}

                {view === 'MAIN' && (
                    <div className="flex flex-col gap-4">
                        <button 
                            onClick={handleCreate}
                            className="group relative h-16 bg-stone-800 hover:bg-stone-700 border border-stone-600 hover:border-indigo-500 rounded-xl transition-all overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/0 via-indigo-600/10 to-indigo-600/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                            <div className="flex items-center justify-center gap-3">
                                <span className="text-2xl">📡</span>
                                <div className="flex flex-col items-start">
                                    <span className="font-bold text-indigo-100 tracking-wider">创建主机</span>
                                    <span className="text-[10px] text-stone-500 uppercase tracking-widest">Create Host Lobby</span>
                                </div>
                            </div>
                        </button>

                        <button 
                            onClick={() => setView('JOIN')}
                            className="group relative h-16 bg-stone-800 hover:bg-stone-700 border border-stone-600 hover:border-emerald-500 rounded-xl transition-all overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/0 via-emerald-600/10 to-emerald-600/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                            <div className="flex items-center justify-center gap-3">
                                <span className="text-2xl">🔗</span>
                                <div className="flex flex-col items-start">
                                    <span className="font-bold text-emerald-100 tracking-wider">加入游戏</span>
                                    <span className="text-[10px] text-stone-500 uppercase tracking-widest">Connect to Peer</span>
                                </div>
                            </div>
                        </button>

                        <button onClick={onBack} className="mt-4 text-stone-500 hover:text-stone-300 text-xs tracking-widest uppercase py-2">
                            返回主菜单
                        </button>
                    </div>
                )}

                {view === 'HOST' && (
                    <div className="flex flex-col items-center gap-6">
                        <div className="text-center">
                            <p className="text-stone-400 text-sm mb-2">您的频段密钥 (Key)</p>
                            {hostId ? (
                                <div className="bg-black/50 border border-indigo-500/50 px-6 py-4 rounded-xl font-mono text-2xl text-indigo-300 tracking-wider select-all cursor-pointer hover:bg-black/70 transition-colors shadow-inner" onClick={() => navigator.clipboard.writeText(hostId)}>
                                    {hostId}
                                </div>
                            ) : (
                                <div className="animate-pulse bg-stone-800 h-12 w-48 rounded-xl"></div>
                            )}
                            <p className="text-[10px] text-stone-500 mt-2">点击复制密钥，发送给对手</p>
                        </div>

                        <div className="flex items-center gap-2 text-indigo-400/80 text-xs font-mono animate-pulse">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                            等待对手连接...
                        </div>

                        <button onClick={() => { setView('MAIN'); onBack(); }} className="mt-4 text-stone-500 hover:text-red-400 text-xs border border-stone-700 px-4 py-2 rounded-lg hover:bg-stone-800 transition-colors">
                            取消
                        </button>
                    </div>
                )}

                {view === 'JOIN' && (
                    <div className="flex flex-col gap-6">
                        <div>
                            <label className="block text-stone-400 text-xs font-bold mb-2 uppercase tracking-wider">输入目标密钥</label>
                            <input 
                                type="text" 
                                value={targetId}
                                onChange={e => setTargetId(e.target.value)}
                                placeholder="例如: 8a2b-3c4d..."
                                className="w-full bg-black/30 border border-stone-600 focus:border-emerald-500 rounded-xl px-4 py-3 text-emerald-100 font-mono text-lg outline-none transition-all placeholder:text-stone-700"
                            />
                        </div>

                        <button 
                            onClick={handleJoin} 
                            disabled={!targetId || isConnecting}
                            className={`h-12 rounded-xl font-bold tracking-widest transition-all ${
                                !targetId || isConnecting 
                                ? 'bg-stone-800 text-stone-600 cursor-not-allowed' 
                                : 'bg-emerald-700 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                            }`}
                        >
                            {isConnecting ? '连接中...' : '连接主机'}
                        </button>

                        <button onClick={() => setView('MAIN')} className="mx-auto text-stone-500 hover:text-stone-300 text-xs">
                            返回
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};