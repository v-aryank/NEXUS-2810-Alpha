import React, { useEffect, useRef, useState } from 'react';
import { useController } from '../context/ControllerContext';
import { Server, Save } from 'lucide-react';
import { formatHeap, formatUptime } from '../utils/format';
import { PageHeader } from '../components/common/PageHeader';

function isValidControllerUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, systemInfo } = useController();

  const [formMode, setFormMode] = useState<'mock' | 'http'>(settings.apiMode);
  const [formUrl, setFormUrl] = useState(settings.controllerUrl);
  const [formPoll, setFormPoll] = useState(String(settings.pollIntervalMs));
  const [formTimeout, setFormTimeout] = useState(String(settings.requestTimeoutMs));
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errors, setErrors] = useState<{ summary: string; fields: Record<string, string> }>({ summary: '', fields: {} });
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFormMode(settings.apiMode);
    setFormUrl(settings.controllerUrl);
    setFormPoll(String(settings.pollIntervalMs));
    setFormTimeout(String(settings.requestTimeoutMs));
  }, [settings]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const fieldErrors: Record<string, string> = {};
    const poll = Number(formPoll);
    const timeout = Number(formTimeout);

    if (formMode === 'http' && !isValidControllerUrl(formUrl)) {
      fieldErrors.controllerUrl = 'Enter a valid http(s) address, or leave blank for same-origin hosting.';
    }
    if (!Number.isFinite(poll) || poll < 1000) {
      fieldErrors.pollIntervalMs = 'Polling interval must be at least 1000 ms.';
    }
    if (!Number.isFinite(timeout) || timeout < 1500) {
      fieldErrors.requestTimeoutMs = 'Request timeout must be at least 1500 ms.';
    }

    if (Object.keys(fieldErrors).length > 0) {
      setSavedSuccess(false);
      setErrors({ summary: 'There is a problem with the controller settings.', fields: fieldErrors });
      window.requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }

    updateSettings({
      apiMode: formMode,
      controllerUrl: formUrl.trim(),
      pollIntervalMs: poll,
      requestTimeoutMs: timeout
    });
    setErrors({ summary: '', fields: {} });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const isSimulated = settings.apiMode === 'mock';
  const telemetryLabel = isSimulated ? 'Simulated telemetry' : 'Hardware telemetry';

  const telemetryRows = [
    { label: 'Model', value: systemInfo?.hardwareModel || 'Unavailable' },
    { label: 'Firmware', value: systemInfo?.firmwareVersion || 'Unavailable' },
    { label: 'Free heap', value: formatHeap(systemInfo?.freeHeapBytes) },
    { label: 'Wi-Fi RSSI', value: systemInfo?.wifiRssi ? `${systemInfo.wifiRssi} dBm` : '—' },
    { label: 'Uptime', value: formatUptime(systemInfo?.uptimeSeconds) },
    { label: 'MAC', value: systemInfo?.macAddress || 'Unavailable' },
    { label: 'Reported IP', value: systemInfo?.ipAddress || 'Unavailable' }
  ];

  return (
    <div className="w-full max-w-[1400px] space-y-5">
      <PageHeader
        eyebrow="NEXUS-2810 / DIAGNOSTICS"
        title="Settings and diagnostics"
        description="Configure the API driver and inspect controller telemetry. No ESP32 address is assumed."
      />

      <form onSubmit={handleSave} className="grid lg:grid-cols-2 gap-4" noValidate>
        <section className="nexus-panel p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-ink">API driver</h3>
            <p className="text-xs text-ink-muted mt-1">Choose simulated demo data or a real ESP32 HTTP endpoint.</p>
          </div>

          {errors.summary && (
            <div
              ref={errorRef}
              tabIndex={-1}
              role="alert"
              aria-labelledby="settings-error-title"
              className="rounded-lg border border-danger/40 bg-danger/10 p-3"
            >
              <h4 id="settings-error-title" className="text-sm font-semibold text-danger">
                {errors.summary}
              </h4>
              <ul className="mt-2 space-y-1 text-xs text-danger">
                {Object.entries(errors.fields).map(([key, message]) => (
                  <li key={key}>
                    <a href={`#${key}`} className="underline">
                      {message}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p id="api-mode-label" className="block text-xs font-semibold text-ink mb-2">
              Driver mode
            </p>
            <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="api-mode-label">
              <button
                type="button"
                onClick={() => setFormMode('mock')}
                aria-pressed={formMode === 'mock'}
                className={`pressable min-h-11 py-2 px-3 rounded-lg border text-sm font-medium text-center ${
                  formMode === 'mock' ? 'bg-accent/15 border-accent text-accent shadow-[0_0_16px_rgba(50,223,255,0.12)]' : 'bg-elevated border-line text-ink-muted hover:border-accent/30'
                }`}
              >
                Simulated
              </button>
              <button
                type="button"
                onClick={() => setFormMode('http')}
                aria-pressed={formMode === 'http'}
                className={`pressable min-h-11 py-2 px-3 rounded-lg border text-sm font-medium text-center ${
                  formMode === 'http' ? 'bg-accent/15 border-accent text-accent shadow-[0_0_16px_rgba(50,223,255,0.12)]' : 'bg-elevated border-line text-ink-muted hover:border-accent/30'
                }`}
              >
                Real ESP32
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="controllerUrl" className="block text-xs font-semibold text-ink mb-1">
              ESP32 LAN base address
            </label>
            <input
              id="controllerUrl"
              type="text"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              placeholder="http://controller-host (optional)"
              aria-invalid={Boolean(errors.fields.controllerUrl)}
              aria-describedby={errors.fields.controllerUrl ? 'controllerUrl-error controllerUrl-help' : 'controllerUrl-help'}
              className="nexus-field font-mono"
            />
            <p id="controllerUrl-help" className="text-[11px] text-ink-muted mt-1">
              Leave blank for same-origin routing when this app is hosted on the controller. Do not use a hardcoded IP.
            </p>
            {errors.fields.controllerUrl && (
              <p id="controllerUrl-error" className="text-xs text-danger mt-1">
                {errors.fields.controllerUrl}
              </p>
            )}
          </div>
        </section>

        <section className="nexus-panel p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-ink">Polling and timeouts</h3>
            <p className="text-xs text-ink-muted mt-1">Controls how often status is fetched and how long requests may wait.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="pollIntervalMs" className="block text-xs font-semibold text-ink mb-1">
                Poll interval (ms)
              </label>
              <input
                id="pollIntervalMs"
                type="number"
                min="1000"
                step="500"
                value={formPoll}
                onChange={(e) => setFormPoll(e.target.value)}
                aria-invalid={Boolean(errors.fields.pollIntervalMs)}
                aria-describedby={errors.fields.pollIntervalMs ? 'pollIntervalMs-error' : undefined}
                className="nexus-field font-mono"
              />
              {errors.fields.pollIntervalMs && (
                <p id="pollIntervalMs-error" className="text-xs text-danger mt-1">
                  {errors.fields.pollIntervalMs}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="requestTimeoutMs" className="block text-xs font-semibold text-ink mb-1">
                Timeout (ms)
              </label>
              <input
                id="requestTimeoutMs"
                type="number"
                min="1500"
                step="500"
                value={formTimeout}
                onChange={(e) => setFormTimeout(e.target.value)}
                aria-invalid={Boolean(errors.fields.requestTimeoutMs)}
                aria-describedby={errors.fields.requestTimeoutMs ? 'requestTimeoutMs-error' : undefined}
                className="nexus-field font-mono"
              />
              {errors.fields.requestTimeoutMs && (
                <p id="requestTimeoutMs-error" className="text-xs text-danger mt-1">
                  {errors.fields.requestTimeoutMs}
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="pressable w-full min-h-11 py-2.5 bg-accent text-canvas rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(50,223,255,0.28)] hover:brightness-110"
          >
            <Save size={15} aria-hidden="true" />
            Save preferences
          </button>

          {savedSuccess && (
            <div role="status" className="p-2 bg-ok/10 border border-ok/30 text-ok text-xs rounded-lg text-center">
              Preferences applied. Driver updated.
            </div>
          )}
        </section>
      </form>

      <section className="nexus-panel p-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-ink text-sm font-semibold">
          <Server size={15} className="text-accent" aria-hidden="true" />
          <span>{telemetryLabel}</span>
          {isSimulated && (
            <span className="font-mono text-[10px] font-semibold tracking-wide bg-warn/10 text-warn border border-warn/30 px-1.5 py-0.5 rounded">
              MOCK VALUES
            </span>
          )}
        </div>
        <p className="text-xs text-ink-muted">
          {isSimulated
            ? 'These figures come from the mock driver and must not be treated as live hardware diagnostics.'
            : systemInfo
            ? 'Values below were reported by the configured controller.'
            : 'No telemetry has been received from the controller yet.'}
        </p>
        <dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {telemetryRows.map((row) => (
            <div key={row.label} className="bg-elevated border border-line rounded-lg px-3 py-2">
              <dt className="text-[11px] uppercase tracking-wider text-ink-muted">{row.label}</dt>
              <dd className="font-mono text-xs text-ink mt-1 break-all">{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
};
