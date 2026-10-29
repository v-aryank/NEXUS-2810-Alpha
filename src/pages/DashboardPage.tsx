import type { FC } from 'react';
import { useController } from '../context/ControllerContext';
import { RelayCard } from '../components/dashboard/RelayCard';
import { StatusSummary } from '../components/dashboard/StatusSummary';
import { PageHeader } from '../components/common/PageHeader';

export const DashboardPage: FC = () => {
  const { channels, settings, connectionState } = useController();
  const isSimulated = settings.apiMode === 'mock';

  return (
    <div className="w-full max-w-[1400px] space-y-5">
      <PageHeader
        eyebrow="NEXUS-2810"
        title="Command center"
        description={
          isSimulated
            ? 'Running against the local simulated driver. Relay states are demo data, not live hardware.'
            : connectionState === 'connected'
              ? 'Connected to the configured ESP32 controller.'
              : connectionState === 'offline'
                ? 'Controller unavailable. Relay commands are disabled.'
                : 'Waiting for the configured ESP32 controller.'
        }
        trailing={isSimulated ? (
          <span className="inline-flex w-fit items-center rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-300">
            Simulated data mode
          </span>
        ) : undefined}
      />

      <StatusSummary />

      <section aria-label="Relay channels">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">
            Relay channels
          </h2>
          <span className="font-mono text-[11px] text-ink-muted">
            {channels.length} circuits
          </span>
        </div>

        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
          {channels.map((channel) => (
            <RelayCard key={channel.id} channel={channel} />
          ))}
        </div>
        <p className="mt-3 text-center text-[11px] leading-relaxed text-ink-muted">
          ON/OFF labels show controller-reported software command state, not physical relay or load feedback.
        </p>
      </section>
    </div>
  );
};
