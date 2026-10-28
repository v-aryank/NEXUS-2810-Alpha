import React from 'react';
import { TabType } from '../../types';
import { LayoutGrid, Cpu, Sliders, Settings } from 'lucide-react';

interface BottomNavProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab }) => {
  const navItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Home', icon: <LayoutGrid size={18} /> },
    { id: 'devices', label: 'Relays', icon: <Cpu size={18} /> },
    { id: 'automations', label: 'Routines', icon: <Sliders size={18} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} /> }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[#070c17]/95 backdrop-blur-lg border-t border-slate-800/90 pb-safe">
      <div className="max-w-md mx-auto flex items-center justify-around px-1 py-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center min-h-[48px] w-full py-1 transition-all select-none ${
                isActive ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <div className="relative">
                {item.icon}
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_4px_#22d3ee]" />
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
