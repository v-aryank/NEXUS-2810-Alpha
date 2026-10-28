import React, { useState } from 'react';
import { ControllerProvider } from './context/ControllerContext';
import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { DashboardPage } from './pages/DashboardPage';
import { DevicesPage } from './pages/DevicesPage';
import { AutomationsPage } from './pages/AutomationsPage';
import { SettingsPage } from './pages/SettingsPage';
import { TabType } from './types';

export const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('home');

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans">
      <Header />
      <main className="flex-1 w-full max-w-md mx-auto px-3.5 py-3">
        {activeTab === 'home' && <DashboardPage />}
        {activeTab === 'devices' && <DevicesPage />}
        {activeTab === 'automations' && <AutomationsPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </main>
      <BottomNav activeTab={activeTab} onSelectTab={setActiveTab} />
    </div>
  );
};

export const App: React.FC = () => (
  <ControllerProvider>
    <AppContent />
  </ControllerProvider>
);

export default App;
