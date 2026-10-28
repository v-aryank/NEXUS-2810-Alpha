import {
  StatusResponseDTO,
  DeviceInfoDTO,
  ConfigDTO,
  RelayCommandResponseDTO,
  AllRelaysCommandResponseDTO
} from './types';
import { MockHomePilotApi } from './mockHomePilotApi';
import { HttpHomePilotApi } from './httpHomePilotApi';

export interface IHomePilotApi {
  getStatus(): Promise<StatusResponseDTO>;
  setRelay(channelId: number, state: boolean): Promise<RelayCommandResponseDTO>;
  setAllRelays(state: boolean): Promise<AllRelaysCommandResponseDTO>;
  getDeviceInfo(): Promise<DeviceInfoDTO>;
  getConfiguration(): Promise<ConfigDTO>;
  updateConfiguration(config: Partial<ConfigDTO>): Promise<ConfigDTO>;
}

export function createHomePilotApi(
  mode: 'mock' | 'http',
  baseUrl: string,
  timeoutMs: number = 3500,
  authToken?: string
): IHomePilotApi {
  if (mode === 'http') {
    return new HttpHomePilotApi(baseUrl, timeoutMs, authToken);
  }
  return new MockHomePilotApi();
}
