export type TabType = 'home' | 'devices' | 'settings';
export type RelayCommandState = 'idle' | 'pending' | 'uncertain' | 'error';

export interface DeviceMetadata {
  id: number;
  name: string;
  room: string;
  iconName: 'light' | 'fan' | 'lamp' | 'outlet' | 'generic';
}

export interface RelayChannel {
  id: number;
  name: string;
  room: string;
  state: boolean;
  commandState: RelayCommandState;
  lastCommandTimestamp: number | null;
  iconName: 'light' | 'fan' | 'lamp' | 'outlet' | 'generic';
}

export type ConnectionState = 'connected' | 'connecting' | 'offline' | 'error';

export interface ControllerSystemInfo {
  firmwareVersion: string;
  hardwareModel: string;
  chipId: string;
  uptimeSeconds: number;
  freeHeapBytes: number;
  wifiRssi: number;
  ipAddress: string;
  macAddress: string;
}

export interface AppSettings {
  apiMode: 'mock' | 'http';
  controllerUrl: string;
  pollIntervalMs: number;
  requestTimeoutMs: number;
  authToken?: string;
  reducedMotion: boolean;
}
