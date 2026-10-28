import { IHomePilotApi } from './homePilotApi';
import {
  StatusResponseDTO,
  DeviceInfoDTO,
  ConfigDTO,
  RelayCommandResponseDTO,
  AllRelaysCommandResponseDTO
} from './types';

export class HttpHomePilotApi implements IHomePilotApi {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly authToken?: string;

  constructor(baseUrl: string = '', timeoutMs: number = 3500, authToken?: string) {
    this.baseUrl = baseUrl.trim() === '/' ? '' : baseUrl.replace(/\/+$/, '');
    this.timeoutMs = timeoutMs;
    this.authToken = authToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {})
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(`ESP32 HTTP ${response.status} (${response.statusText}): ${errorBody || 'Request failed'}`);
      }

      return (await response.json()) as T;
    } catch (error: unknown) {
      if (controller.signal.aborted) {
        throw new Error(`Request to ${endpoint} timed out after ${this.timeoutMs}ms.`);
      }
      if (error instanceof Error) {
        throw new Error(`Controller communication failure: ${error.message}`);
      }
      throw new Error('An unknown network error occurred while communicating with the controller.');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async getStatus(): Promise<StatusResponseDTO> {
    const data = await this.request<StatusResponseDTO>('/api/v1/status', { method: 'GET' });
    if (typeof data.revision !== 'number' || !Array.isArray(data.relays)) {
      throw new Error('Malformed status payload received from ESP32.');
    }
    return data;
  }

  async setRelay(channelId: number, state: boolean): Promise<RelayCommandResponseDTO> {
    if (channelId < 1 || channelId > 6) {
      throw new Error(`Channel ${channelId} is invalid (must be 1–6).`);
    }

    const result = await this.request<RelayCommandResponseDTO>(`/api/v1/relays/${channelId}`, {
      method: 'PUT',
      body: JSON.stringify({ state })
    });

    if (!result || result.success !== true) {
      throw new Error(`Hardware rejected relay ${channelId} actuation.`);
    }

    return result;
  }

  async setAllRelays(state: boolean): Promise<AllRelaysCommandResponseDTO> {
    const result = await this.request<AllRelaysCommandResponseDTO>('/api/v1/relays/all', {
      method: 'PUT',
      body: JSON.stringify({ state })
    });

    if (!result || result.success !== true) {
      throw new Error('Hardware rejected All-Off command.');
    }

    return result;
  }

  async getDeviceInfo(): Promise<DeviceInfoDTO> {
    return this.request<DeviceInfoDTO>('/api/v1/device', { method: 'GET' });
  }

  async getConfiguration(): Promise<ConfigDTO> {
    return this.request<ConfigDTO>('/api/v1/config', { method: 'GET' });
  }

  async updateConfiguration(config: Partial<ConfigDTO>): Promise<ConfigDTO> {
    return this.request<ConfigDTO>('/api/v1/config', {
      method: 'PUT',
      body: JSON.stringify(config)
    });
  }
}
