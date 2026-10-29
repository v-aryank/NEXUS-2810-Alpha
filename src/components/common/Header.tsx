import React, { useState } from 'react';
import { useController } from '../../context/ControllerContext';
import { RefreshCw, Wifi, WifiOff, AlertTriangle, Radio } from 'lucide-react';
import { formatClock } from '../../utils/format';

export const Header: React.FC = () => {
  const { connectionState, settings, lastSyncTime, manualRefresh, errorMessage } = useController();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isSimulated = settings.apiMode === 'mock';

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    try {
      await manualRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const statusLabel = isSimulated
    ? connectionState === 'connected'
      ? 'Simulated online'
      : connectionState === 'connecting'
      ? 'Starting demo'
      : 'Demo unavailable'
    : connectionState === 'connected'
    ? 'Controller online'
    : connectionState === 'connecting'
    ? 'Connecting'
    : 'Controller offline';

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-[#060910]/80 backdrop-blur-md pt-safe">
      <div className="flex items-center justify-between gap-3 px-4 lg:px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="lg:hidden">
            <p className="font-semibold tracking-tight text-sm text-ink">
              NEXUS<span className="text-accent">-2810</span>
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-3 min-w-0">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted">System status</span>
            <span className="text-slate-600">/</span>
            <span className="font-mono text-[12px] text-ink truncate">{statusLabel}</span>
          </div>
          {isSimulated && (
            <span className="font-mono text-[10px] font-semibold tracking-wide bg-amber-500/15 text-amber-300 border border-amber-400/30 px-1.5 py-0.5 rounded">
              <span className="sm:hidden">DEMO</span>
              <span className="hidden sm:inline">SIMULATED DATA</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline font-mono text-[11px] text-ink-muted">{formatClock(lastSyncTime)}</span>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border min-h-8 ${
              connectionState === 'connected'
                ? isSimulated
                  ? 'bg-indigo-500/15 text-accent-secondary border-indigo-400/30'
                  : 'bg-emerald-500/10 text-ok border-emerald-400/30'
                : connectionState === 'connecting'
                ? 'bg-sky-500/10 text-accent border-accent/30'
                : 'bg-rose-500/10 text-danger border-rose-400/30'
            }`}
          >
            {connectionState === 'connected' ? (
              <>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${isSimulated ? 'bg-accent-secondary' : 'bg-ok dot-live'}`}
                  aria-hidden="true"
                />
                {isSimulated ? (
                  <Radio size={12} className="shrink-0" aria-hidden="true" />
                ) : (
                  <Wifi size={12} className="shrink-0 text-ok" aria-hidden="true" />
                )}
              </>
            ) : connectionState === 'connecting' ? (
              <RefreshCw size={12} className="animate-spin shrink-0" aria-hidden="true" />
            ) : (
              <WifiOff size={12} className="shrink-0" aria-hidden="true" />
            )}
            <span className="max-w-[4.5rem] truncate text-[10px] capitalize sm:max-w-none sm:text-[11px]">
              {isSimulated && connectionState === 'connected'
                ? 'Demo'
                : connectionState === 'connected'
                  ? 'Online'
                  : connectionState === 'connecting'
                    ? 'Connecting'
                    : 'Offline'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            aria-label="Refresh controller status"
            className="pressable h-11 w-11 flex items-center justify-center rounded-xl bg-elevated border border-line text-ink-muted hover:text-accent hover:border-accent/40"
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-accent' : ''} aria-hidden="true" />
          </button>
        </div>
      </div>

      {errorMessage && (
        <div role="alert" className="mx-4 lg:mx-6 mb-3 p-2.5 bg-rose-950/70 border border-rose-500/40 rounded-xl flex items-start gap-2 text-rose-200 text-xs leading-relaxed">
          <AlertTriangle size={14} className="shrink-0 text-danger" aria-hidden="true" />
          <span className="min-w-0 break-words font-mono">{errorMessage}</span>
        </div>
      )}
    </header>
  );
};
