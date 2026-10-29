import React, { useState } from 'react';
import { useController } from '../../context/ControllerContext';
import { Power, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { ConfirmationModal } from '../common/ConfirmationModal';

export const StatusSummary: React.FC = () => {
  const {
    channels,
    channelsOnCount,
    channelsOffCount,
    sendAllOffCommand,
    connectionState,
    settings,
  } = useController();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const isSimulated = settings.apiMode === 'mock';
  const isOffline = connectionState === 'offline';
  const hasPendingCommands = channels.some(
    (channel) => channel.commandState === 'pending'
  );

  const isAllOffDisabled =
    channelsOnCount === 0 ||
    isOffline ||
    isExecuting ||
    hasPendingCommands;

  const handleConfirmAllOff = async () => {
    if (isAllOffDisabled) return;

    setShowConfirmModal(false);
    setIsExecuting(true);

    try {
      await sendAllOffCommand();
    } finally {
      setIsExecuting(false);
    }
  };

  const active = channelsOnCount > 0;

  return (
    <>
      <section
        aria-label="Relay status and global controls"
        className="overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-panel via-panel/95 to-[#0a1424]"
      >
        <div className="grid grid-cols-2 divide-x divide-line sm:grid-cols-[1fr_1fr_auto]">
          {/* Active status and energy orb */}
          <div
            className={`relative flex min-h-[100px] items-center gap-3 overflow-hidden p-3 sm:p-4 ${
              active ? 'bg-cyan-400/[0.035]' : ''
            }`}
          >
            <div
              className="energy-orb relative flex h-12 w-12 shrink-0 items-center justify-center"
              role="img"
              aria-label={active ? 'Active energy orb' : 'Idle energy orb'}
            >
              <span
                className={`absolute inset-1 rounded-full blur-md transition-opacity duration-500 ${
                  active ? 'bg-cyan-400/60 opacity-100' : 'bg-slate-500/10 opacity-30'
                }`}
              />

              {active && (
                <span className="energy-orb__ring absolute inset-1 rounded-full border border-cyan-300/50" />
              )}

              <span
                className={`energy-orb__core relative block h-7 w-7 rounded-full border transition-all duration-500 ${
                  active
                    ? 'border-cyan-100/80 bg-[radial-gradient(circle_at_30%_25%,#ffffff_0%,#a5f3fc_12%,#22d3ee_35%,#2563eb_68%,#101a48_100%)] shadow-[0_0_12px_rgba(34,211,238,0.85),0_0_28px_rgba(37,99,235,0.55)]'
                    : 'border-slate-500/60 bg-[radial-gradient(circle_at_30%_25%,#94a3b8_0%,#475569_45%,#1e293b_100%)]'
                }`}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-accent">
                <ToggleRight size={14} aria-hidden="true" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  Active relays
                </span>
              </div>
              <p className="mt-1 font-mono text-2xl font-semibold tracking-tight text-accent">
                {String(channelsOnCount).padStart(2, '0')}
              </p>
              <p className="text-[10px] text-ink-muted">
                {active ? 'Energy online' : 'Standby'}
              </p>
            </div>
          </div>

          {/* Inactive status */}
          <div className="flex min-h-[100px] items-center gap-3 p-3 sm:p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-slate-800/60">
              <ToggleLeft size={20} className="text-ink-muted" aria-hidden="true" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                Inactive relays
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold text-ink">
                {String(channelsOffCount).padStart(2, '0')}
              </p>
              <p className="text-[10px] text-ink-muted">
                Out of {channels.length} channels
              </p>
            </div>
          </div>

          {/* Global All OFF control */}
          <div className="col-span-2 flex flex-col justify-center gap-2 border-t border-line p-3 sm:col-span-1 sm:min-w-[180px] sm:border-l sm:border-t-0 sm:p-4">
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              disabled={isAllOffDisabled}
              aria-label="Turn off all relays"
              className={`pressable inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 font-mono text-xs font-bold tracking-wide transition-colors ${
                !isAllOffDisabled
                  ? 'border-rose-500/50 bg-gradient-to-r from-rose-950/90 to-red-950/70 text-rose-200 shadow-[0_0_16px_rgba(244,63,94,0.12)] hover:border-rose-400 hover:shadow-[0_0_20px_rgba(244,63,94,0.2)]'
                  : 'cursor-not-allowed border-line bg-elevated/60 text-ink-muted opacity-60'
              }`}
            >
              {isExecuting ? (
                <Loader2 size={15} className="animate-spin" aria-hidden="true" />
              ) : (
                <Power
                  size={15}
                  className={!isAllOffDisabled ? 'text-rose-400' : ''}
                  aria-hidden="true"
                />
              )}
              {isExecuting ? 'EXECUTING…' : 'ALL OFF'}
            </button>

            <p className="text-center text-[10px] leading-relaxed text-ink-muted">
              {isOffline
                ? 'Controller disconnected'
                : hasPendingCommands
                  ? 'Waiting for relay command'
                  : channelsOnCount === 0
                    ? 'All channels already off'
                    : isSimulated
                      ? 'Turn off all simulated relays'
                      : 'Turn off all relay channels'}
            </p>
          </div>
        </div>

        {/* Compact ON/OFF indicator strip */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line bg-elevated/40 px-3 py-2.5 sm:px-4">
          <span className="inline-flex items-center gap-2">
            <span className="dot-active h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
            <span className="font-mono text-xs font-semibold text-cyan-200">
              {channelsOnCount} ON
            </span>
          </span>

          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-slate-500" aria-hidden="true" />
            <span className="font-mono text-xs font-semibold text-ink-muted">
              {channelsOffCount} OFF
            </span>
          </span>

          <span className="ml-auto text-[10px] text-ink-muted">
            {isSimulated
              ? 'Mock driver'
              : connectionState === 'connected'
                ? 'Controller connected'
                : connectionState === 'offline'
                  ? 'Controller offline'
                  : 'Connecting…'}
          </span>
        </div>
      </section>

      <ConfirmationModal
        isOpen={showConfirmModal}
        title="Execute ALL OFF?"
        message={
          isSimulated
            ? 'This will send an OFF command to all six simulated relay channels.'
            : 'This command will send an OFF command to all six relay channels. Connected loads may lose power.'
        }
        confirmLabel="Turn Off All"
        onConfirm={handleConfirmAllOff}
        onCancel={() => setShowConfirmModal(false)}
      />
    </>
  );
};
