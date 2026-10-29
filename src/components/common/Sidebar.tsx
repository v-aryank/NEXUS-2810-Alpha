import React from 'react';
import { TabType } from '../../types';
import { NAV_ITEMS } from '../../navigation';
import { useController } from '../../context/ControllerContext';

interface SidebarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const { settings, connectionState } = useController();
  const isSimulated = settings.apiMode === 'mock';

  return (
    <aside className="hidden lg:flex w-[232px] shrink-0 flex-col border-r border-line bg-panel/80 backdrop-blur-md">
      <div className="px-5 py-5 border-b border-line">
        <p className="font-mono text-[10px] tracking-[0.22em] text-accent">NEXUS</p>
        <h1 className="text-lg font-semibold tracking-tight text-ink leading-none mt-1">2810-Alpha</h1>
        <p className="mt-2 text-xs text-ink-muted">6-channel command center</p>
      </div>

      <nav className="flex-1 p-3 space-y-1" aria-label="Primary">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`pressable w-full flex items-start gap-3 rounded-xl px-3 py-2.5 text-left ${
                isActive
                  ? 'bg-accent/10 text-accent shadow-glow'
                  : 'text-ink-muted hover:bg-elevated hover:text-ink hover:border-accent/20'
              }`}
            >
              <Icon size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
              <span>
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="block text-[11px] text-ink-muted mt-0.5">{item.description}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-line">
        <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">Data source</p>
        <p className="mt-1 text-sm font-medium text-ink">
          {isSimulated ? 'Simulated driver' : 'ESP32 HTTP driver'}
        </p>
        <p className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-ink-muted capitalize">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              connectionState === 'connected'
                ? isSimulated
                  ? 'bg-accent-secondary'
                  : 'bg-ok dot-live'
                : connectionState === 'connecting'
                ? 'bg-accent'
                : 'bg-danger'
            }`}
            aria-hidden="true"
          />
          {connectionState}
        </p>
      </div>
    </aside>
  );
};
