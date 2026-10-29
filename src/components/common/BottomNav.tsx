import React from 'react';
import { TabType } from '../../types';
import { NAV_ITEMS } from '../../navigation';

interface BottomNavProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab }) => {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-canvas/95 backdrop-blur-lg border-t border-line pb-safe" aria-label="Primary">
      <div className="flex items-center justify-around px-1 py-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`pressable flex flex-col items-center justify-center min-h-[48px] min-w-[48px] w-full py-1 select-none ${
                isActive ? 'text-accent font-semibold' : 'text-ink-muted hover:text-ink'
              }`}
            >
              <span className="relative">
                <Icon size={18} aria-hidden="true" />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-accent rounded-full shadow-[0_0_6px_#32dfff]" />
                )}
              </span>
              <span className="text-[10px] tracking-tight mt-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
