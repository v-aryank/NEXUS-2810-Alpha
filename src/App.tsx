import React, { useState } from 'react';
import { ControllerProvider } from './context/ControllerContext';
import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { Sidebar } from './components/common/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { DevicesPage } from './pages/DevicesPage';
import { AutomationsPage } from './pages/AutomationsPage';
import { SettingsPage } from './pages/SettingsPage';
import { TabType } from './types';

export const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('home');

  return (
    <div className="min-h-screen bg-transparent text-ink flex font-sans">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-elevated focus:text-ink focus:px-3 focus:py-2 focus:rounded-lg"
      >
        Skip to main content
      </a>
      <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <Header />
        <main id="main-content" className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-4 lg:py-6 pb-24 lg:pb-8">
          <div key={activeTab} className="page-enter">
            {activeTab === 'home' && <DashboardPage />}
            {activeTab === 'devices' && <DevicesPage />}
            {activeTab === 'automations' && <AutomationsPage />}
            {activeTab === 'settings' && <SettingsPage />}
          </div>
        </main>
        <BottomNav activeTab={activeTab} onSelectTab={setActiveTab} />
      </div>
    </div>
  );
};

export const App: React.FC = () => (
  <ControllerProvider>
    <AppContent />
  </ControllerProvider>
);

export default App;
