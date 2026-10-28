import React, { useState } from 'react';
import { useController } from '../../context/ControllerContext';
import { Power } from 'lucide-react';
import { ConfirmationModal } from '../common/ConfirmationModal';

export const StatusSummary: React.FC = () => {
  const { channelsOnCount, channelsOffCount, sendAllOffCommand, connectionState } = useController();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const handleConfirmAllOff = async () => {
    setShowConfirmModal(false);
    setIsExecuting(true);
    await sendAllOffCommand();
    setIsExecuting(false);
  };

  const isAllOffDisabled = channelsOnCount === 0 || connectionState === 'offline' || isExecuting;

  return (
    <>
      <div className="bg-[#0b1322] border border-slate-800/90 rounded-2xl p-3 shadow-md">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 bg-cyan-950/40 border border-cyan-800/50 px-2.5 py-1 rounded-xl">
              <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
              <span className="text-xs font-mono font-bold text-cyan-200">{channelsOnCount}</span>
              <span className="text-[10px] font-semibold text-cyan-400/80">ON</span>
            </div>
            <div className="flex items-center space-x-1.5 bg-slate-800/50 border border-slate-700/60 px-2.5 py-1 rounded-xl">
              <span className="h-2 w-2 rounded-full bg-slate-500" />
              <span className="text-xs font-mono font-bold text-slate-300">{channelsOffCount}</span>
              <span className="text-[10px] font-semibold text-slate-400">OFF</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            disabled={isAllOffDisabled}
            aria-label="Turn off all relays"
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold font-mono tracking-tight transition-all duration-150 border ${
              !isAllOffDisabled
                ? 'bg-rose-950/70 text-rose-200 border-rose-800 active:scale-95 shadow-[0_0_10px_rgba(225,29,72,0.2)]'
                : 'bg-slate-900/60 text-slate-500 border-slate-800/70 cursor-not-allowed opacity-60'
            }`}
          >
            <Power size={13} className={!isAllOffDisabled ? 'text-rose-400' : 'text-slate-600'} />
            <span>ALL OFF</span>
          </button>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showConfirmModal}
        title="Execute ALL OFF?"
        message="This command issues an immediate hardware OFF signal to all 6 relays. Active loads will be disconnected."
        confirmLabel="Turn Off All"
        onConfirm={handleConfirmAllOff}
        onCancel={() => setShowConfirmModal(false)}
      />
    </>
  );
};
