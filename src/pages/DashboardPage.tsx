import React from 'react';
import { useController } from '../context/ControllerContext';
import { RelayCard } from '../components/dashboard/RelayCard';
import { StatusSummary } from '../components/dashboard/StatusSummary';
import { ShieldCheck } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { channels } = useController();

  return (
    <div className="space-y-3 pb-24 max-w-md mx-auto">
      <StatusSummary />

      <main aria-label="Relay Channels">
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {channels.map((channel) => (
            <RelayCard key={channel.id} channel={channel} />
          ))}
        </div>
      </main>

      <footer className="pt-1">
        <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl px-3 py-2 flex items-center space-x-2 text-[10px] text-slate-400 leading-snug">
          <ShieldCheck size={14} className="text-cyan-400 shrink-0" />
          <span>Reflects commanded coil state. All switch toggles issue explicit idempotent ON/OFF payloads.</span>
        </div>
      </footer>
    </div>
  );
};
