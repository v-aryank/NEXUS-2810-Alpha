import React from 'react';
import { RelayChannel } from '../../types';
import { useController } from '../../context/ControllerContext';
import { Lightbulb, Fan, Lamp, Power, Cpu, Loader2, AlertCircle, WifiOff } from 'lucide-react';
import { RelaySwitch } from './RelaySwitch';

export const RelayCard: React.FC<{ channel: RelayChannel }> = ({ channel }) => {
  const { sendRelayCommand, connectionState, settings } = useController();

  const isPending = channel.commandState === 'pending';
  const isFailed = channel.commandState === 'uncertain' || channel.commandState === 'error';
  const isConnected = connectionState === 'connected';
  const isDisabled = isPending || !isConnected;
  const isOn = channel.state && isConnected;

  const handleCommandToggle = () => {
    if (isDisabled) return;
    sendRelayCommand(channel.id, !channel.state);
  };

  const renderIcon = () => {
    const iconSize = 20;
    const baseClass = isOn ? 'text-accent' : 'text-ink-muted';
    switch (channel.iconName) {
      case 'light':
        return <Lightbulb size={iconSize} className={baseClass} aria-hidden="true" />;
      case 'fan':
        return <Fan size={iconSize} className={baseClass} aria-hidden="true" />;
      case 'lamp':
        return <Lamp size={iconSize} className={baseClass} aria-hidden="true" />;
      case 'outlet':
        return <Power size={iconSize} className={baseClass} aria-hidden="true" />;
      default:
        return <Cpu size={iconSize} className={baseClass} aria-hidden="true" />;
    }
  };

  const stateLabel = isPending
    ? 'Pending'
    : isFailed
    ? 'Unconfirmed'
    : !isConnected
    ? connectionState === 'connecting' ? 'Connecting' : 'Disconnected'
    : channel.state
    ? 'Commanded on'
    : 'Commanded off';

  return (
    <article
      aria-label={`${channel.name}, Channel 0${channel.id}, currently ${stateLabel}`}
      className={`relay-card relative flex flex-col justify-between rounded-2xl p-4 min-h-[168px] ${isOn ? 'is-on' : ''}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-[background-color,border-color,box-shadow] duration-200 ${
            isOn
              ? 'bg-accent/15 border-accent/40 shadow-[0_0_10px_rgba(50,223,255,0.28)]'
              : 'bg-slate-800/80 border-slate-700/70'
          }`}
        >
          {renderIcon()}
        </div>
        <span className="font-mono text-[10px] font-bold tracking-wider text-ink-muted bg-canvas/70 px-2 py-1 rounded-full border border-line">
          CH 0{channel.id}
        </span>
      </div>

      <div className="my-3 min-w-0">
        <h3 className="text-sm font-semibold text-ink tracking-tight leading-tight truncate">{channel.name}</h3>
        <p className="text-xs text-ink-muted truncate mt-1">{channel.room}</p>
      </div>

      <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          {isPending ? (
            <div className="flex items-center gap-1.5 text-accent font-mono text-[11px] font-medium">
              <Loader2 size={12} className="animate-spin shrink-0" aria-hidden="true" />
              <span>PENDING</span>
            </div>
          ) : isFailed ? (
            <div className="flex items-center gap-1.5 text-warn font-mono text-[11px] font-medium">
              <AlertCircle size={12} className="shrink-0" aria-hidden="true" />
              <span>UNCONFIRMED</span>
            </div>
          ) : !isConnected ? (
            <div className="flex items-center gap-1.5 text-danger font-mono text-[11px] font-medium">
              <WifiOff size={12} className="shrink-0" aria-hidden="true" />
              <span>{connectionState === 'connecting' ? 'CONNECTING' : 'OFFLINE'}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${
                  channel.state ? 'bg-accent shadow-[0_0_8px_#32dfff]' : 'bg-slate-500'
                }`}
                aria-hidden="true"
              />
              <span
                className={`text-[11px] font-mono font-bold tracking-wider uppercase ${
                  channel.state ? 'text-accent' : 'text-ink-muted'
                }`}
              >
                {channel.state ? 'CMD ON' : 'CMD OFF'}
              </span>
              {settings.apiMode === 'mock' && <span className="sr-only">Simulated state</span>}
            </div>
          )}
        </div>

        <RelaySwitch
          checked={channel.state}
          disabled={isDisabled}
          pending={isPending}
          label={`Toggle Channel 0${channel.id} ${channel.name}`}
          onToggle={handleCommandToggle}
        />
      </div>
    </article>
  );
};
