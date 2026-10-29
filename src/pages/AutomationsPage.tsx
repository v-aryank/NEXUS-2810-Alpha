import React from 'react';
import { CalendarClock, ShieldAlert, Clock, Ban } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';

export const AutomationsPage: React.FC = () => {
  const planned = [
    { title: 'Weekday lighting', detail: 'Not implemented — no schedule is stored or executed.' },
    { title: 'All-off at night', detail: 'Not implemented — use the manual All OFF control instead.' },
    { title: 'Fan timer', detail: 'Not implemented — firmware RTC timers are not exposed in this build.' }
  ];

  return (
    <div className="w-full max-w-[1400px] space-y-5">
      <PageHeader
        eyebrow="NEXUS-2810 / ROUTINES"
        title="Routines"
        description="This page is a design preview only. No schedules, timers, or automations run from the web app."
        trailing={
          <span className="inline-flex w-fit items-center rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 font-mono text-[10px] font-semibold tracking-wide text-warn">
            PLACEHOLDER
          </span>
        }
      />

      <div className="nexus-panel grid items-start gap-5 p-6 md:grid-cols-[auto_1fr] md:p-8">
        <div className="w-12 h-12 bg-accent/10 border border-accent/30 text-accent rounded-xl flex items-center justify-center shadow-[0_0_16px_rgba(50,223,255,0.15)]">
          <CalendarClock size={24} aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-ink">Scheduling is not available</h3>
          <p className="text-sm text-ink-muted mt-2 leading-relaxed max-w-2xl">
            Local on-chip timers remain a firmware milestone. This interface does not create, persist, or fire routines, even in simulated mode.
          </p>
          <p className="inline-flex items-center gap-2 mt-4 font-mono text-[11px] text-accent bg-accent-dim border border-accent/20 px-2.5 py-1 rounded">
            <Clock size={12} aria-hidden="true" />
            Target: firmware-native RTC
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        {planned.map((item) => (
          <article key={item.title} className="rounded-2xl border border-line bg-elevated/80 p-4 transition-colors duration-200 hover:border-accent-secondary/30">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
              <Ban size={14} className="text-ink-muted" aria-hidden="true" />
            </div>
            <p className="text-xs text-ink-muted mt-2 leading-relaxed">{item.detail}</p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-warn mt-3">Inactive placeholder</p>
          </article>
        ))}
      </div>

      <div className="bg-warn/10 border border-warn/30 rounded-xl p-4 flex items-start gap-2.5 text-sm text-warn">
        <ShieldAlert size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
        <p>
          Do not rely on this screen for appliance scheduling. Safe timers must reside on the microcontroller RTC, not in the browser.
        </p>
      </div>
    </div>
  );
};
