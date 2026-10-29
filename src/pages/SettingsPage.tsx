import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useController } from '../context/ControllerContext';
import { Server, Save, RefreshCw, Cpu } from 'lucide-react';
import { formatHeap, formatUptime } from '../utils/format';
import { PageHeader } from '../components/common/PageHeader';
import { createHomePilotApi } from '../api/homePilotApi';
import { RelayHardwareConfigDTO } from '../api/types';
import { relayMappingError } from '../api/gpioMapping';

function isValidApiBaseUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  try {
    const parsed = new URL(trimmed);
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      parsed.origin === trimmed.replace(/\/+$/, '')
    );
  } catch {
    return false;
  }
}

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, systemInfo, deviceInfoError, connectionState } = useController();
  const api = React.useMemo(() => createHomePilotApi(
    settings.apiMode, settings.controllerUrl, settings.requestTimeoutMs, settings.authToken
  ), [settings.apiMode, settings.controllerUrl, settings.requestTimeoutMs, settings.authToken]);
  const [hardware, setHardware] = useState<RelayHardwareConfigDTO | null>(null);
  const [gpioValues, setGpioValues] = useState<number[]>([]);
  const [hardwareMessage, setHardwareMessage] = useState('');
  const [hardwareError, setHardwareError] = useState('');
  const [confirmApply, setConfirmApply] = useState(false);
  const [hardwareBusy, setHardwareBusy] = useState(true);
  const hardwareRequestId = useRef(0);

  const loadHardware = useCallback(async () => {
    const requestId = ++hardwareRequestId.current;
    setHardwareBusy(true); setHardwareError(''); setHardwareMessage('');
    try {
      const config = await api.getRelayHardwareConfig();
      if (requestId !== hardwareRequestId.current) return;
      setHardware(config);
      setGpioValues(config.stagedGpios?.length === 6 ? config.stagedGpios : config.activeGpios);
      setConfirmApply(false);
    } catch (err) {
      if (requestId === hardwareRequestId.current) {
        setHardwareError(err instanceof Error ? err.message : 'Could not read hardware configuration.');
      }
    } finally {
      if (requestId === hardwareRequestId.current) setHardwareBusy(false);
    }
  }, [api]);

  useEffect(() => {
    setHardware(null);
    setGpioValues([]);
    setConfirmApply(false);
    void loadHardware();
  }, [loadHardware]);

  const proposedMapping = gpioValues.map((gpio, index) => ({ id: index + 1, gpio }));
  const mappingError = hardware ? relayMappingError(proposedMapping, hardware.supportedGpios) : null;
  const currentProposal = hardware?.stagedGpios ?? hardware?.activeGpios ?? [];
  const hasUnsavedChanges =
    gpioValues.length === 6 && currentProposal.some((gpio, index) => gpioValues[index] !== gpio);
  const hasStagedMapping = Boolean(hardware?.stagedGpios?.length === 6);

  const saveHardware = async () => {
    if (!hardware || connectionState !== 'connected' || mappingError || hardwareBusy) return;
    const requestId = ++hardwareRequestId.current;
    const requestedPins = [...gpioValues];
    setHardwareBusy(true); setHardwareError(''); setHardwareMessage('');
    try {
      const staged = await api.saveRelayGpioMapping({ channels: proposedMapping });
      if (requestId !== hardwareRequestId.current) return;
      if (
        !staged.stagedGpios ||
        staged.stagedGpios.some((gpio, index) => gpio !== requestedPins[index]) ||
        staged.activeGpios.some((gpio, index) => gpio !== hardware.activeGpios[index])
      ) {
        throw new Error('Controller response did not confirm the requested staged mapping. Reload the configuration before continuing.');
      }
      setHardware(staged);
      setHardwareMessage(settings.apiMode === 'mock'
        ? 'Simulated mapping validated and staged in demo memory.'
        : 'Mapping validated and staged in ESP32 memory. It is not active or persistent until applied.');
      setConfirmApply(false);
    } catch (err) {
      if (requestId === hardwareRequestId.current) {
        setHardwareError(err instanceof Error ? err.message : 'Mapping was rejected.');
      }
    } finally {
      if (requestId === hardwareRequestId.current) setHardwareBusy(false);
    }
  };

  const applyHardware = async () => {
    if (
      !hardware ||
      connectionState !== 'connected' ||
      !hardware.stagedGpios ||
      hardware.allRelaysOff !== true ||
      hardware.commandPending ||
      mappingError ||
      hasUnsavedChanges ||
      !confirmApply ||
      hardwareBusy
    ) return;
    const requestId = ++hardwareRequestId.current;
    const requestedPins = [...hardware.stagedGpios];
    setHardwareBusy(true); setHardwareError(''); setHardwareMessage('');
    try {
      const active = await api.applyRelayGpioMapping();
      if (requestId !== hardwareRequestId.current) return;
      if (
        active.activeGpios.some((gpio, index) => gpio !== requestedPins[index]) ||
        active.stagedGpios ||
        !active.allRelaysOff ||
        active.commandPending
      ) {
        throw new Error('The controller did not confirm the requested mapping as active. Reload its configuration before retrying.');
      }
      setHardware(active);
      setGpioValues(active.activeGpios);
      setHardwareMessage(settings.apiMode === 'mock'
        ? 'Simulated mapping is active in demo memory only; it is not saved to ESP32 NVS.'
        : 'ESP32 confirmed the mapping active. Firmware persists it in NVS before changing GPIO assignments.');
      setConfirmApply(false);
    } catch (err) {
      if (requestId === hardwareRequestId.current) {
        setHardwareError(
          `${err instanceof Error ? err.message : 'Mapping could not be applied.'} The result may be uncertain if the connection failed; load the controller configuration before retrying.`
        );
      }
    } finally {
      if (requestId === hardwareRequestId.current) setHardwareBusy(false);
    }
  };

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

    if (formMode === 'http' && !isValidApiBaseUrl(formUrl)) {
      fieldErrors.controllerUrl = 'Enter an http(s) gateway origin without a path, or leave blank for same-origin hosting.';
    }
    if (!Number.isFinite(poll) || poll < 1000) {
      fieldErrors.pollIntervalMs = 'Polling interval must be at least 1000 ms.';
    }
    if (!Number.isFinite(timeout) || timeout < 6000) {
      fieldErrors.requestTimeoutMs = 'Request timeout must be at least 6000 ms so the API gateway can return its timeout error.';
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
              API gateway base address
            </label>
            <input
              id="controllerUrl"
              type="text"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              placeholder="https://api.example.com (optional)"
              aria-invalid={Boolean(errors.fields.controllerUrl)}
              aria-describedby={errors.fields.controllerUrl ? 'controllerUrl-error controllerUrl-help' : 'controllerUrl-help'}
              className="nexus-field font-mono"
            />
            <p id="controllerUrl-help" className="text-[11px] text-ink-muted mt-1">
              Leave blank to use this site's same-origin /api gateway. Otherwise enter a deployed gateway origin, not the ESP32 address; the gateway must allow this site's origin.
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
                min="6000"
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
              Preferences saved. Reconnecting with the selected API settings.
            </div>
          )}
        </section>
      </form>

      <section className="nexus-panel min-w-0 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink inline-flex items-center gap-2"><Cpu size={15} className="text-accent" /> Relay GPIO mapping</h3>
            <p className="text-xs text-ink-muted mt-1">Choose from this firmware profile's supported pins; physical board and wiring safety must be verified separately.</p>
          </div>
          <button type="button" onClick={() => void loadHardware()} disabled={hardwareBusy} className="pressable min-h-11 w-full sm:w-auto px-3 rounded-lg border border-line text-xs text-ink inline-flex items-center justify-center gap-2"><RefreshCw size={14} aria-hidden="true"/>Reload configuration</button>
        </div>
        <p className="rounded-lg border border-warn/30 bg-warn/10 text-warn p-3 text-xs leading-relaxed">A GPIO assignment changes firmware control, not physical wiring. Verify the board, driver, polarity, and all six wires before applying. This firmware has no physical relay feedback; OFF checks reflect software command state only.</p>
        {hardwareBusy && !hardware && <p role="status" className="text-sm text-ink-muted">Loading GPIO configuration…</p>}
        {hardware && <>
          <div className="space-y-2 text-xs text-ink-muted">
            <p className="break-words">Board profile: <strong className="text-ink">{hardware.board}</strong> · Firmware polarity assumption: <strong className="text-ink">{hardware.polarity}</strong></p>
            <p className="break-words">Currently active: {hardware.activeGpios.map((gpio, index) => `CH${index + 1} → GPIO ${gpio}`).join(' · ')}</p>
          </div>
          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }, (_, index) => (
              <label key={index} htmlFor={`relay-gpio-${index + 1}`} className="min-w-0 text-xs text-ink-muted">
                <span className="block">Channel {index + 1} · active GPIO {hardware.activeGpios[index]}</span>
                <select
                  id={`relay-gpio-${index + 1}`}
                  className="nexus-field mt-1"
                  value={gpioValues[index] ?? hardware.activeGpios[index]}
                  disabled={hardwareBusy}
                  onChange={(event) => {
                    setGpioValues((previous) =>
                      previous.map((gpio, itemIndex) =>
                        itemIndex === index ? Number(event.target.value) : gpio
                      )
                    );
                    setHardwareMessage('');
                    setHardwareError('');
                    setConfirmApply(false);
                  }}
                >
                  {hardware.supportedGpios.map((gpio) => (
                    <option key={gpio} value={gpio}>GPIO {gpio}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="space-y-1 text-xs" aria-live="polite">
            {mappingError ? (
              <p role="alert" className="text-danger">{mappingError}</p>
            ) : hasUnsavedChanges ? (
              <p className="text-warn">Unsaved local changes. Validate and stage them before applying.</p>
            ) : hasStagedMapping ? (
              <p className="text-accent">Validated mapping is staged in controller memory; the active mapping is unchanged until applied.</p>
            ) : (
              <p className="text-ink-muted">No pending changes. The displayed mapping is active on the controller.</p>
            )}
            {settings.apiMode === 'mock' && (
              <p className="text-warn">Simulated mode only: changes are demo memory and are not persisted to ESP32 NVS.</p>
            )}
            {connectionState !== 'connected' && settings.apiMode === 'http' && (
              <p className="text-danger">Connect to the configured ESP32 before validating or applying a mapping.</p>
            )}
            {hardware.commandPending && (
              <p className="text-warn">A relay command is pending. Wait for it to finish before applying a mapping.</p>
            )}
            {!hardware.allRelaysOff && (
              <p className="text-warn">The controller reports a commanded ON state. Turn all channels OFF before applying; this is not physical relay feedback.</p>
            )}
            <p className="text-ink-muted">Firmware-supported pins: {hardware.supportedGpios.map((gpio) => `GPIO ${gpio}`).join(', ')}. Other pins in 16–33 are rejected by firmware; this list does not verify physical board connections.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => void saveHardware()}
              disabled={hardwareBusy || connectionState !== 'connected' || Boolean(mappingError) || !hasUnsavedChanges}
              className="pressable min-h-11 w-full px-4 rounded-lg bg-elevated border border-line text-sm text-ink disabled:opacity-40"
            >
              {hardwareBusy ? 'Working…' : 'Validate and stage'}
            </button>
            <label className="flex min-h-11 items-start gap-2 rounded-lg border border-line bg-elevated/50 p-3 text-xs text-ink">
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 shrink-0 accent-cyan-400"
                checked={confirmApply}
                disabled={hardwareBusy || connectionState !== 'connected' || !hasStagedMapping || hasUnsavedChanges || !hardware.allRelaysOff || hardware.commandPending}
                onChange={(event) => setConfirmApply(event.target.checked)}
              />
              <span>I verified the physical wiring matches the staged mapping. Controller-reported OFF is software state, not relay feedback.</span>
            </label>
          </div>
          <button
            type="button"
            onClick={() => void applyHardware()}
            disabled={
              hardwareBusy ||
              connectionState !== 'connected' ||
              !confirmApply ||
              !hasStagedMapping ||
              hasUnsavedChanges ||
              !hardware.allRelaysOff ||
              hardware.commandPending
            }
            className="pressable min-h-11 w-full px-4 rounded-lg bg-accent text-canvas text-sm font-semibold disabled:opacity-40"
          >
            {hardwareBusy ? 'Working…' : settings.apiMode === 'mock' ? 'Apply in demo' : 'Apply and save on ESP32'}
          </button>
        </>}
        {hardwareError && <p role="alert" className="break-words text-sm text-danger">{hardwareError}</p>}
        {hardwareMessage && <p role="status" className="break-words text-sm text-ok">{hardwareMessage}</p>}
      </section>

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
        {deviceInfoError && (
          <p role="alert" className="break-words text-xs text-danger">{deviceInfoError}</p>
        )}
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
