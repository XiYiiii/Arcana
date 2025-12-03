
import React, { useRef, useEffect } from 'react';
import { NetworkMessage } from '../../../types/network';

interface NetworkDebugOverlayProps {
  logs: NetworkMessage[];
  role: 'HOST' | 'CLIENT';
  onSimulateReceive: () => void; // For testing purposes
  onClearLogs: () => void;
  onClose: () => void;
}

export const NetworkDebugOverlay: React.FC<NetworkDebugOverlayProps> = ({ 
  logs, 
  role, 
  onSimulateReceive, 
  onClearLogs,
  onClose 
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const safeStringify = (data: any) => {
      try {
          return JSON.stringify(data, null, 2);
      } catch (e) {
          return "<< CIRCULAR / NON-SERIALIZABLE CONTENT >>";
      }
  };

  return (
    <div className="fixed top-20 right-4 w-96 bg-black/90 border border-green-500/50 rounded-lg shadow-[0_0_20px_rgba(0,255,0,0.2)] flex flex-col font-mono text-xs z-[9999] max-h-[80vh] backdrop-blur-md animate-in slide-in-from-right-10 duration-300">
      
      {/* Header */}
      <div className="flex justify-between items-center p-3 border-b border-green-500/30 bg-green-900/20">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-green-400 font-bold tracking-wider">NETWORK LOG ({role})</span>
        </div>
        <div className="flex gap-2">
            <button onClick={onSimulateReceive} className="px-2 py-1 bg-green-800 text-green-100 rounded hover:bg-green-700 transition text-[10px]">
                模拟接收
            </button>
            <button onClick={onClearLogs} className="px-2 py-1 bg-stone-800 text-stone-400 rounded hover:bg-stone-700 transition text-[10px]">
                清空
            </button>
            <button onClick={onClose} className="text-green-500 hover:text-green-300 font-bold px-2">
            ✕
            </button>
        </div>
      </div>

      {/* Logs Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[300px]">
        {logs.length === 0 && (
            <div className="text-center text-green-500/30 italic py-10">Waiting for data stream...</div>
        )}
        {logs.map((log) => {
          const isOut = log.sender === role;
          return (
            <div key={log.id} className={`flex flex-col p-2 rounded border ${isOut ? 'bg-blue-900/20 border-blue-500/30' : 'bg-orange-900/20 border-orange-500/30'}`}>
              <div className="flex justify-between items-center mb-1 opacity-70">
                <span className={`font-bold ${isOut ? 'text-blue-400' : 'text-orange-400'}`}>
                    {isOut ? '⬆ SENT (OUT)' : '⬇ RECV (IN)'}
                </span>
                <span className="text-[10px] text-stone-500">
                    {new Date(log.timestamp).toLocaleTimeString().split(' ')[0]}.{String(log.timestamp % 1000).padStart(3, '0')}
                </span>
              </div>
              
              <div className="text-white font-bold mb-1">[{log.type}]</div>
              
              <div className="bg-black/50 p-1.5 rounded overflow-x-auto">
                <pre className={`whitespace-pre-wrap break-all ${isOut ? 'text-blue-300' : 'text-orange-300'}`}>
                  {safeStringify(log.payload)}
                </pre>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Status */}
      <div className="p-2 border-t border-green-500/30 text-center text-green-600 bg-black/40 text-[10px]">
         STATUS: CONNECTED (Secure)
      </div>
    </div>
  );
};
