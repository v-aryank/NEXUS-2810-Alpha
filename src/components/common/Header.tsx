import React, { useState } from 'react';
import { useController } from '../../context/ControllerContext';
import { RefreshCw, Wifi, WifiOff, AlertTriangle } from 'lucide-react';

export const Header: React.FC = () => {
  const { connectionState, settings, lastSyncTime, manualRefresh, errorMessage } = useController();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    await manualRefresh();
    setTimeout(() => setIsRefreshing(false), 450);
  };

  const formatTime = (date: Date | null) => {
    if (!date) return '--:--:--';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <header className="sticky top-0 z-30 bg-[#070c17]/95 backdrop-blur-md border-b border-slate-800/80 px-3.5 py-2.5">
      <div className="mx-auto flex items-center justify-between max-w-md">
        <div className="flex items-center space-x-1.5 min-w-0">
          <div className="flex items-center space-x-1">
            <span className="font-bold tracking-tight text-sm text-slate-100">
              NEXUS<span className="text-cyan-400">-2810</span>
            </span>
            {settings.apiMode === 'mock' && (
              <span className="text-[9px] font-mono font-extrabold bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1 py-0.2 rounded tracking-wide">
                DEMO
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 font-mono hidden xs:inline border-l border-slate-800 pl-1.5">
            {formatTime(lastSyncTime)}
          </span>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <div
            className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
              connectionState === 'connected'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : connectionState === 'connecting'
                ? 'bg-blue-500/10 text-blue-300 border-blue-500/30 animate-pulse'
                : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
            }`}
          >
            {connectionState === 'connected' ? (
              <Wifi size={11} className="text-emerald-400 shrink-0" />
            ) : connectionState === 'connecting' ? (
              <RefreshCw size={11} className="animate-spin text-blue-400 shrink-0" />
            ) : (
              <WifiOff size={11} className="text-rose-400 shrink-0" />
            )}
            <span className="capitalize text-[10px]">{connectionState}</span>
          </div>

          <button
            type="button"
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            aria-label="Refresh ESP32 status"
            className="h-8 w-8 flex items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700/70 text-slate-300 active:scale-95 active:text-cyan-300 transition-transform"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-cyan-400' : ''} />
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="mx-auto mt-2 max-w-md p-2 bg-rose-950/80 border border-rose-800/90 rounded-xl flex items-center space-x-1.5 text-rose-200 text-[11px]">
          <AlertTriangle size={13} className="text-rose-400 shrink-0" />
          <span className="truncate font-mono">{errorMessage}</span>
        </div>
      )}
    </header>
  );
};
