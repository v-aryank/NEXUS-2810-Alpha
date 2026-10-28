import React from 'react';
import { RelayChannel } from '../../types';
import { useController } from '../../context/ControllerContext';
import { Lightbulb, Fan, Lamp, Power, Cpu, Loader2, AlertCircle } from 'lucide-react';

export const RelayCard: React.FC<{ channel: RelayChannel }> = ({ channel }) => {
  const { sendRelayCommand, connectionState } = useController();

  const isPending = channel.commandState === 'pending';
  const isUncertain = channel.commandState === 'uncertain';
  const isOffline = connectionState === 'offline';
  const isDisabled = isPending || isOffline;

  const handleCommandToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isDisabled) return;
    sendRelayCommand(channel.id, !channel.state);
  };

  const renderIcon = () => {
    const iconSize = 20;
    const baseClass = channel.state ? 'text-cyan-300' : 'text-slate-400';
    switch (channel.iconName) {
      case 'light': return <Lightbulb size={iconSize} className={baseClass} />;
      case 'fan': return <Fan size={iconSize} className={`${baseClass} ${channel.state ? 'animate-spin' : ''}`} style={{ animationDuration: '2.5s' }} />;
      case 'lamp': return <Lamp size={iconSize} className={baseClass} />;
      case 'outlet': return <Power size={iconSize} className={baseClass} />;
      default: return <Cpu size={iconSize} className={baseClass} />;
    }
  };

  return (
    <article
      aria-label={`${channel.name}, Channel 0${channel.id}, currently ${channel.state ? 'ON' : 'OFF'}`}
      className={`relative flex flex-col justify-between rounded-2xl border p-3 transition-colors duration-200 select-none ${
        channel.state
          ? 'bg-gradient-to-b from-[#0f2347] to-[#0c182e] border-cyan-500/50 shadow-[0_0_16px_rgba(6,182,212,0.14)]'
          : 'bg-[#0d1527]/90 border-slate-800/90 active:border-slate-700'
      }`}
    >
      <div className="flex items-center justify-between">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
            channel.state
              ? 'bg-cyan-500/15 border-cyan-400/40 shadow-[0_0_8px_rgba(34,211,238,0.25)]'
              : 'bg-slate-800/70 border-slate-700/60'
          }`}
        >
          {renderIcon()}
        </div>
        <span className="font-mono text-[10px] font-bold tracking-wider text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded-full border border-slate-800">
          CH 0{channel.id}
        </span>
      </div>

      <div className="my-2.5 min-w-0">
        <h3 className="text-[13px] font-semibold text-slate-100 tracking-tight leading-tight truncate">
          {channel.name}
        </h3>
        <p className="text-[10.5px] font-medium text-slate-400 truncate mt-0.5">
          {channel.room}
        </p>
      </div>

      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
        <div className="min-w-0 pr-1">
          {isPending ? (
            <div className="flex items-center space-x-1 text-cyan-400 text-[10px] font-mono font-medium">
              <Loader2 size={11} className="animate-spin shrink-0" />
              <span className="truncate">SYNCING</span>
            </div>
          ) : isUncertain ? (
            <div className="flex items-center space-x-1 text-amber-400 text-[10px] font-mono font-medium">
              <AlertCircle size={11} className="shrink-0" />
              <span className="truncate">CHECKING</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5">
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${channel.state ? 'bg-cyan-400 shadow-[0_0_6px_#22d3ee]' : 'bg-slate-600'}`} />
              <span className={`text-[10.5px] font-mono font-bold tracking-wider uppercase ${channel.state ? 'text-cyan-300' : 'text-slate-400'}`}>
                {channel.state ? 'ON' : 'OFF'}
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleCommandToggle}
          disabled={isDisabled}
          role="switch"
          aria-checked={channel.state}
          aria-label={`Toggle Channel 0${channel.id} ${channel.name}`}
          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ${
            channel.state ? 'bg-cyan-500' : 'bg-slate-800 border border-slate-700/80'
          } ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'}`}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
              channel.state ? 'translate-x-5 bg-slate-50' : 'translate-x-0 bg-slate-300'
            }`}
          />
        </button>
      </div>
    </article>
  );
};
