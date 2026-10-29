export interface RelayStateDTO {
  id: number;
  state: boolean;
}

export interface StatusResponseDTO {
  revision: number;
  relays: RelayStateDTO[];
  uptimeSeconds: number;
  wifiRssi: number;
  freeHeap: number;
}

export interface RelayCommandResponseDTO {
  success: boolean;
  channelId: number;
  state: boolean;
  revision: number;
}

export interface AllRelaysCommandResponseDTO {
  success: boolean;
  state: boolean;
  revision: number;
}

export interface DeviceInfoDTO {
  model: string;
  firmware: string;
  chipId: string;
  mac: string;
  ip: string;
}

export interface ConfigDTO {
  deviceName: string;
  names: Record<string, string>;
  rooms: Record<string, string>;
}

export interface RelayHardwareConfigDTO {
  board: string;
  polarity: 'ACTIVE_HIGH';
  supportedGpios: number[];
  activeGpios: number[];
  stagedGpios?: number[] | null;
  channels: Array<{ id: number; gpio: number }>;
  allRelaysOff: boolean;
  commandPending: boolean;
  stateCertain: boolean;
}

export interface RelayGpioMappingDTO {
  channels: Array<{ id: number; gpio: number }>;
}
