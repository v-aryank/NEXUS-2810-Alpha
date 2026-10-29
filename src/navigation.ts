import { LayoutGrid, Cpu, CalendarClock, Settings } from 'lucide-react';
import { TabType } from './types';

export const NAV_ITEMS: { id: TabType; label: string; description: string; icon: typeof LayoutGrid }[] = [
  { id: 'home', label: 'Home', description: 'Command overview', icon: LayoutGrid },
  { id: 'devices', label: 'Relays', description: 'Channel control', icon: Cpu },
  { id: 'automations', label: 'Routines', description: 'Schedules (planned)', icon: CalendarClock },
  { id: 'settings', label: 'Settings', description: 'Driver and diagnostics', icon: Settings }
];
