import React, { useState } from 'react';
import { useController } from '../context/ControllerContext';
import { Server, Save } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, systemInfo } = useController();

  const [formMode, setFormMode] = useState<'mock' | 'http'>(settings.apiMode);
  const [formUrl, setFormUrl] = useState(settings.controllerUrl);
  const [formPoll, setFormPoll] = useState(String(settings.pollIntervalMs));
  const [formTimeout, setFormTimeout] = useState(String(settings.requestTimeoutMs));
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      apiMode: formMode,
      controllerUrl: formUrl.trim(),
      pollIntervalMs: Math.max(1000, Number(formPoll) || 3000),
      requestTimeoutMs: Math.max(1500, Number(formTimeout) || 3500)
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-4 pb-20 max-w-md mx-auto">
      <div>
        <h2 className="text-base font-semibold text-slate-100">Controller Settings</h2>
        <p className="text-xs text-slate-400 mt-0.5">Configure ESP32 communication parameters and driver mode.</p>
      </div>

      <form onSubmit={handleSave} className="bg-[#0f172a]/80 border border-slate-800 rounded-xl p-4 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">API Driver Implementation</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormMode('mock')}
              className={`py-2 px-3 rounded-lg border text-xs font-medium text-center transition-all ${
                formMode === 'mock' ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              Simulated (Demo)
            </button>
            <button
              type="button"
              onClick={() => setFormMode('http')}
              className={`py-2 px-3 rounded-lg border text-xs font-medium text-center transition-all ${
                formMode === 'http' ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              Real ESP32 (HTTP)
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">ESP32 LAN Base Address</label>
          <input
            type="text"
            value={formUrl}
            onChange={(e) => setFormUrl(e.target.value)}
            placeholder="http://<esp32-ip> (blank when hosted on ESP32)"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-400"
          />
          <p className="text-[11px] text-slate-500 mt-1">Leave blank to use relative same-origin routing when hosted on LittleFS.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Poll Rate (ms)</label>
            <input
              type="number"
              min="1000"
              step="500"
              value={formPoll}
              onChange={(e) => setFormPoll(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Timeout (ms)</label>
            <input
              type="number"
              min="1000"
              step="500"
              value={formTimeout}
              onChange={(e) => setFormTimeout(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 active:scale-[0.98] text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)]"
        >
          <Save size={15} />
          <span>Save Preferences</span>
        </button>

        {savedSuccess && (
          <div className="p-2 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs rounded text-center">
            Preferences applied. Driver updated.
          </div>
        )}
      </form>

      <div className="bg-[#0f172a]/80 border border-slate-800 rounded-xl p-4 space-y-2.5">
        <div className="flex items-center space-x-2 text-slate-200 text-xs font-semibold">
          <Server size={15} className="text-cyan-400" />
          <span>Hardware Telemetry</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 pt-1">
          <div>Model: <span className="text-slate-200">{systemInfo?.hardwareModel || 'ESP32'}</span></div>
          <div>Firmware: <span className="text-slate-200">{systemInfo?.firmwareVersion || 'v2.8.1'}</span></div>
          <div>Free Heap: <span className="text-slate-200">{systemInfo?.freeHeapBytes ? `${Math.round(systemInfo.freeHeapBytes / 1024)} KB` : '--'}</span></div>
          <div>Wi-Fi RSSI: <span className="text-slate-200">{systemInfo?.wifiRssi ? `${systemInfo.wifiRssi} dBm` : '--'}</span></div>
          <div className="col-span-2 truncate">MAC: <span className="text-slate-200">{systemInfo?.macAddress || 'Unknown'}</span></div>
        </div>
      </div>
    </div>
  );
};
