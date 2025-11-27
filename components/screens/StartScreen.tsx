

import React, { useState, useEffect } from 'react';
import { networkManager } from '../../services/networkUtils';

interface StartScreenProps {
  onStartGame: (mode: 'LOCAL' | 'ONLINE_HOST' | 'ONLINE_GUEST') => void;
  onOpenDeckBuilder: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStartGame, onOpenDeckBuilder }) => {
  const [view, setView] = useState<'MAIN' | 'ONLINE'>('MAIN');
  const [onlineMode, setOnlineMode] = useState<'HOST' | 'JOIN' | null>(null);
  
  const [myId, setMyId] = useState<string>('');
  const [hostIdInput, setHostIdInput] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  // Cleanup on unmount
  useEffect(() => {
      return () => {
          // If we exit this screen without starting game, close network
          // But actually we might want to keep it if we are just transitioning.
          // For now, reset is handled by App logic if needed.
      };
  }, []);

  const handleHost = async () => {
      setOnlineMode('HOST');
      setStatus('正在初始化主机...');
      try {
          const id = await networkManager.hostGame((data) => {
             // Handled in App.tsx mainly, but we can detect hello here
             console.log("Lobby received data:", data);
          });
          setMyId(id);
          setStatus('等待对手加入...');
          
          networkManager.onConnect = () => {
              setStatus('对手已连接！进入游戏...');
              setTimeout(() => onStartGame('ONLINE_HOST'), 1000);
          };
      } catch (e: any) {
          setError(e.message || "Init failed");
      }
  };

  const handleJoin = async () => {
      if (!hostIdInput) return;
      setOnlineMode('JOIN');
      setStatus('正在连接...');
      try {
          await networkManager.joinGame(hostIdInput, (data) => {
              // Handled in App
          });
          setStatus('连接成功！等待主机开始...');
          networkManager.onConnect = () => {
              setStatus('连接成功！进入游戏...');
              setTimeout(() => onStartGame('ONLINE_GUEST'), 1000);
          };
      } catch (e: any) {
          setStatus('');
          setError("连接失败: " + e.message);
          setOnlineMode(null); // Reset to try again
      }
  };

  const copyId = () => {
      navigator.clipboard.writeText(myId);
      setStatus("ID 已复制到剪贴板！等待对手...");
  };

  const renderOnlineMenu = () => (
      <div className="flex flex-col gap-4 w-full max-w-sm animate-in fade-in slide-in-from-right-10 duration-500">
          <button onClick={() => { setView('MAIN'); networkManager.close(); setOnlineMode(null); setError(''); }} className="self-start text-stone-500 hover:text-stone-300 mb-2 text-xs uppercase tracking-widest">
              ← 返回主菜单
          </button>
          
          <h2 className="text-2xl font-serif font-bold text-amber-500 text-center mb-4">联机大厅</h2>

          {!onlineMode && (
              <div className="flex gap-4">
                  <button 
                    onClick={handleHost}
                    className="flex-1 py-8 bg-stone-900 border border-stone-700 hover:border-amber-600 rounded-lg flex flex-col items-center gap-2 transition-all hover:bg-stone-800"
                  >
                      <span className="text-4xl">🏠</span>
                      <span className="font-bold text-stone-200">创建房间</span>
                      <span className="text-xs text-stone-500">我是主机</span>
                  </button>
                  <button 
                    onClick={() => setOnlineMode('JOIN')}
                    className="flex-1 py-8 bg-stone-900 border border-stone-700 hover:border-blue-600 rounded-lg flex flex-col items-center gap-2 transition-all hover:bg-stone-800"
                  >
                      <span className="text-4xl">🚀</span>
                      <span className="font-bold text-stone-200">加入房间</span>
                      <span className="text-xs text-stone-500">我是客机</span>
                  </button>
              </div>
          )}

          {onlineMode === 'HOST' && (
              <div className="bg-stone-900 p-6 rounded-lg border border-amber-800 flex flex-col items-center gap-4 text-center">
                  <div className="text-stone-400 text-xs uppercase tracking-widest">你的房间 ID</div>
                  {myId ? (
                      <div 
                        onClick={copyId}
                        className="text-2xl font-mono text-amber-400 bg-stone-950 px-4 py-2 rounded border border-stone-800 cursor-pointer hover:bg-stone-800 select-all"
                      >
                          {myId}
                      </div>
                  ) : (
                      <div className="animate-pulse text-stone-500">生成中...</div>
                  )}
                  <p className="text-xs text-stone-500">{status}</p>
              </div>
          )}

          {onlineMode === 'JOIN' && (
              <div className="bg-stone-900 p-6 rounded-lg border border-blue-900 flex flex-col gap-4">
                   <div className="text-stone-400 text-xs uppercase tracking-widest text-center">输入主机 ID</div>
                   <input 
                      type="text" 
                      value={hostIdInput}
                      onChange={e => setHostIdInput(e.target.value)}
                      placeholder="粘贴 ID (e.g. 5f3a...)"
                      className="w-full bg-stone-950 border border-stone-700 rounded p-3 text-center text-stone-200 focus:border-blue-500 outline-none font-mono"
                   />
                   <button 
                      onClick={handleJoin}
                      disabled={!hostIdInput || status.includes('连接成功')}
                      className="w-full py-3 bg-blue-800 hover:bg-blue-700 disabled:bg-stone-800 disabled:text-stone-600 rounded font-bold text-blue-100 transition-colors"
                   >
                       连接
                   </button>
                   <p className="text-xs text-stone-500 text-center min-h-[1.5em]">{status}</p>
              </div>
          )}
          
          {error && (
              <div className="bg-red-900/50 border border-red-800 text-red-200 px-4 py-2 rounded text-sm text-center">
                  {error}
              </div>
          )}
      </div>
  );

  return (
    <div className="fixed inset-0 bg-stone-950 flex flex-col items-center justify-center z-50 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 animate-pulse"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-900/20 via-stone-950/80 to-stone-950 pointer-events-none"></div>
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-1000 w-full px-4">
        <div className="text-center space-y-4">
            <h1 className="text-5xl md:text-8xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-500 to-amber-800 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)] tracking-widest">
                ARCANA
            </h1>
            <h2 className="text-sm md:text-xl text-stone-400 font-serif tracking-[0.5em] uppercase opacity-80">
                Duel of Fates
            </h2>
        </div>

        {view === 'MAIN' ? (
            <div className="flex flex-col gap-4 w-full max-w-xs">
            
            {/* Local Multiplayer */}
            <button 
                onClick={() => onStartGame('LOCAL')}
                className="group relative px-8 py-4 bg-stone-900 border border-amber-700/50 rounded-lg overflow-hidden transition-all hover:scale-105 hover:border-amber-500 hover:shadow-[0_0_30px_rgba(245,158,11,0.2)]"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-900/0 via-amber-900/20 to-amber-900/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                <div className="relative flex flex-col items-center z-10">
                    <span className="font-serif font-bold text-xl text-amber-100 tracking-widest group-hover:text-white">
                    本地双人
                    </span>
                    <span className="text-[10px] text-amber-500/60 uppercase tracking-widest mt-1">Local Multiplayer</span>
                </div>
            </button>

            {/* Online Multiplayer */}
            <button 
                onClick={() => setView('ONLINE')}
                className="relative px-8 py-3 bg-stone-900/80 border border-stone-700 hover:border-blue-500/50 rounded-lg flex flex-col items-center overflow-hidden group transition-all"
            >
                <span className="font-serif font-bold text-lg text-stone-400 tracking-widest group-hover:text-blue-200 transition-colors">联机对战</span>
                <span className="text-[9px] text-stone-600 uppercase tracking-widest group-hover:text-blue-500/50">Online P2P</span>
            </button>

            <div className="w-full h-px bg-stone-800/50 my-2"></div>

            <button 
                onClick={onOpenDeckBuilder}
                className="px-8 py-3 bg-transparent border border-stone-700 rounded-lg text-stone-400 font-serif tracking-widest hover:bg-stone-800 hover:text-stone-200 hover:border-stone-500 transition-all text-sm"
            >
                开局设置
            </button>
            </div>
        ) : renderOnlineMenu()}
      </div>

      <div className="absolute bottom-8 text-stone-600 text-xs font-mono">
        PROJECT BLANK v0.3.1 (Netplay Alpha)
      </div>
    </div>
  );
};