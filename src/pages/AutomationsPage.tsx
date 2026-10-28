import React from 'react';
import { CalendarClock, ShieldAlert } from 'lucide-react';

export const AutomationsPage: React.FC = () => {
  return (
    <div className="space-y-4 pb-20 max-w-md mx-auto">
      <div>
        <h2 className="text-base font-semibold text-slate-100">Routines & Schedules</h2>
        <p className="text-xs text-slate-400 mt-0.5">Local on-chip automation and timer triggers.</p>
      </div>

      <div className="bg-[#0f172a]/70 border border-slate-800 rounded-xl p-8 text-center space-y-4">
        <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/30 text-cyan-400 rounded-2xl mx-auto flex items-center justify-center">
          <CalendarClock size={28} />
        </div>
        <div className="max-w-xs mx-auto space-y-1.5">
          <h3 className="text-sm font-semibold text-slate-200">Firmware-Native Timers</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Local scheduling is configured at the ESP32 RTC level to guarantee execution even during Wi-Fi or phone outages.
          </p>
        </div>
        <div className="inline-block bg-slate-800/80 border border-slate-700 px-3 py-1 rounded-full text-[11px] font-mono text-cyan-300">
          Target Milestone: Firmware v2.9
        </div>
      </div>

      <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-3.5 flex items-start space-x-2.5 text-xs text-amber-300/90">
        <ShieldAlert size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed">
          Safe appliance scheduling must always reside on the physical microcontroller RTC, never in phone background threads.
        </p>
      </div>
    </div>
  );
};
