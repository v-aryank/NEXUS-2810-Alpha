import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { RelayChannel, ConnectionState, ControllerSystemInfo, AppSettings, DeviceMetadata } from '../types';
import { IHomePilotApi, createHomePilotApi } from '../api/homePilotApi';

const DEFAULT_METADATA: DeviceMetadata[] = [
  { id: 1, name: 'Bedroom Light', room: 'Master Bedroom', iconName: 'light' },
  { id: 2, name: 'Ceiling Fan', room: 'Master Bedroom', iconName: 'fan' },
  { id: 3, name: 'Study Lamp', room: 'Office', iconName: 'lamp' },
  { id: 4, name: 'Living Room Light', room: 'Living Room', iconName: 'light' },
  { id: 5, name: 'Power Outlet', room: 'Kitchen', iconName: 'outlet' },
  { id: 6, name: 'Spare Channel', room: 'Utility', iconName: 'generic' }
];

const isLocalDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const DEFAULT_SETTINGS: AppSettings = {
  apiMode: isLocalDev ? 'mock' : 'http',
  controllerUrl: '',
  pollIntervalMs: 3000,
  requestTimeoutMs: 3500,
  reducedMotion: false
};

interface ControllerContextType {
  channels: RelayChannel[];
  connectionState: ConnectionState;
  lastSyncTime: Date | null;
  errorMessage: string | null;
  systemInfo: ControllerSystemInfo | null;
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  updateChannelMetadata: (id: number, name: string, room: string) => void;
  sendRelayCommand: (channelId: number, targetState: boolean) => Promise<boolean>;
  sendAllOffCommand: () => Promise<boolean>;
  manualRefresh: () => Promise<void>;
  channelsOnCount: number;
  channelsOffCount: number;
}

const ControllerContext = createContext<ControllerContextType | undefined>(undefined);

export const ControllerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('nexus_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        delete parsed.authToken; // Never restore credentials from localStorage.
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {}
    return DEFAULT_SETTINGS;
  });

  const [metadata, setMetadata] = useState<DeviceMetadata[]>(() => {
    try {
      const saved = localStorage.getItem('nexus_channel_meta');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_METADATA;
  });

  const [channels, setChannels] = useState<RelayChannel[]>(() =>
    DEFAULT_METADATA.map((meta) => ({
      id: meta.id,
      name: meta.name,
      room: meta.room,
      iconName: meta.iconName,
      state: false,
      commandState: 'idle',
      lastCommandTimestamp: null
    }))
  );

  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [systemInfo, setSystemInfo] = useState<ControllerSystemInfo | null>(null);

  const apiRef = useRef<IHomePilotApi>(
    createHomePilotApi(settings.apiMode, settings.controllerUrl, settings.requestTimeoutMs)
  );

  const isPollingRef = useRef<boolean>(false);
  const highestRevisionRef = useRef<number>(0);
  const activeCommandsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    apiRef.current = createHomePilotApi(
      settings.apiMode,
      settings.controllerUrl,
      settings.requestTimeoutMs,
      settings.authToken
    );
    try {
      const persistedSettings = { ...settings, authToken: undefined };
      localStorage.setItem('nexus_settings', JSON.stringify(persistedSettings));
    } catch {}
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem('nexus_channel_meta', JSON.stringify(metadata));
    } catch {}
  }, [metadata]);

  useEffect(() => {
    setChannels((prev) =>
      prev.map((ch) => {
        const found = metadata.find((m) => m.id === ch.id);
        return found ? { ...ch, name: found.name, room: found.room, iconName: found.iconName } : ch;
      })
    );
  }, [metadata]);

  const fetchDeviceInfo = useCallback(async () => {
    try {
      const info = await apiRef.current.getDeviceInfo();
      setSystemInfo((prev) => ({
        firmwareVersion: info.firmware,
        hardwareModel: info.model,
        chipId: info.chipId,
        macAddress: info.mac,
        ipAddress: info.ip,
        uptimeSeconds: prev?.uptimeSeconds || 0,
        freeHeapBytes: prev?.freeHeapBytes || 0,
        wifiRssi: prev?.wifiRssi || 0
      }));
    } catch {}
  }, []);

  const syncStatus = useCallback(async () => {
    if (isPollingRef.current) return;
    isPollingRef.current = true;

    try {
      const data = await apiRef.current.getStatus();

      if (data.revision < highestRevisionRef.current) {
        return;
      }
      highestRevisionRef.current = data.revision;

      setChannels((prevChannels) =>
        prevChannels.map((channel) => {
          if (activeCommandsRef.current.has(channel.id)) {
            return channel;
          }
          const remoteItem = data.relays.find((r) => r.id === channel.id);
          if (!remoteItem) return channel;
          return {
            ...channel,
            state: remoteItem.state,
            commandState: 'idle'
          };
        })
      );

      setSystemInfo((prev) =>
        prev
          ? {
              ...prev,
              uptimeSeconds: data.uptimeSeconds,
              freeHeapBytes: data.freeHeap,
              wifiRssi: data.wifiRssi
            }
          : null
      );

      setConnectionState('connected');
      setLastSyncTime(new Date());
      setErrorMessage(null);
    } catch (err: unknown) {
      setConnectionState('offline');
      const msg = err instanceof Error ? err.message : 'ESP32 controller unreachable';
      setErrorMessage(msg);
    } finally {
      isPollingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchDeviceInfo();
    syncStatus();

    let intervalId: any = null;

    const startPolling = () => {
      if (!intervalId) {
        intervalId = setInterval(syncStatus, settings.pollIntervalMs);
      }
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    startPolling();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncStatus();
        startPolling();
      } else {
        stopPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [syncStatus, fetchDeviceInfo, settings.pollIntervalMs]);

  const sendRelayCommand = async (channelId: number, targetState: boolean): Promise<boolean> => {
    if (activeCommandsRef.current.has(channelId)) return false;
    activeCommandsRef.current.add(channelId);

    setChannels((prev) =>
      prev.map((c) =>
        c.id === channelId ? { ...c, commandState: 'pending', lastCommandTimestamp: Date.now() } : c
      )
    );

    try {
      const response = await apiRef.current.setRelay(channelId, targetState);
      if (response.success && response.channelId === channelId) {
        if (response.revision >= highestRevisionRef.current) {
          highestRevisionRef.current = response.revision;
        }
        setChannels((prev) =>
          prev.map((c) => (c.id === channelId ? { ...c, state: response.state, commandState: 'idle' } : c))
        );
        setLastSyncTime(new Date());
        return true;
      }
      throw new Error('ESP32 returned invalid verification.');
    } catch (err: unknown) {
      setChannels((prev) =>
        prev.map((c) => (c.id === channelId ? { ...c, commandState: 'uncertain' } : c))
      );
      const msg = err instanceof Error ? err.message : 'Relay command failure';
      setErrorMessage(`CH 0${channelId}: ${msg}`);
      setTimeout(() => syncStatus(), 1000);
      return false;
    } finally {
      activeCommandsRef.current.delete(channelId);
    }
  };

  const sendAllOffCommand = async (): Promise<boolean> => {
    const allChannelIds = [1, 2, 3, 4, 5, 6];
    allChannelIds.forEach((id) => activeCommandsRef.current.add(id));

    setChannels((prev) => prev.map((c) => ({ ...c, commandState: 'pending' })));

    try {
      const response = await apiRef.current.setAllRelays(false);
      if (response.success) {
        if (response.revision >= highestRevisionRef.current) {
          highestRevisionRef.current = response.revision;
        }
        setChannels((prev) => prev.map((c) => ({ ...c, state: false, commandState: 'idle' })));
        setLastSyncTime(new Date());
        return true;
      }
      throw new Error('Controller failed to confirm All-Off command.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'All-off command failed';
      setErrorMessage(msg);
      setChannels((prev) => prev.map((c) => ({ ...c, commandState: 'uncertain' })));
      setTimeout(() => syncStatus(), 1000);
      return false;
    } finally {
      allChannelIds.forEach((id) => activeCommandsRef.current.delete(id));
    }
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const updateChannelMetadata = (id: number, name: string, room: string) => {
    setMetadata((prev) => prev.map((item) => (item.id === id ? { ...item, name, room } : item)));
  };

  const channelsOnCount = channels.filter((c) => c.state).length;
  const channelsOffCount = channels.length - channelsOnCount;

  return (
    <ControllerContext.Provider
      value={{
        channels,
        connectionState,
        lastSyncTime,
        errorMessage,
        systemInfo,
        settings,
        updateSettings,
        updateChannelMetadata,
        sendRelayCommand,
        sendAllOffCommand,
        manualRefresh: syncStatus,
        channelsOnCount,
        channelsOffCount
      }}
    >
      {children}
    </ControllerContext.Provider>
  );
};

export const useController = () => {
  const context = useContext(ControllerContext);
  if (!context) throw new Error('useController must be used within ControllerProvider');
  return context;
};
