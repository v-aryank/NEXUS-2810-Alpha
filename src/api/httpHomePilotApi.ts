import { IHomePilotApi } from './homePilotApi';
import {
  StatusResponseDTO,
  DeviceInfoDTO,
  ConfigDTO,
  RelayCommandResponseDTO,
  AllRelaysCommandResponseDTO,
  RelayHardwareConfigDTO,
  RelayGpioMappingDTO
} from './types';
import { parseRelayHardwareConfig, relayMappingError } from './gpioMapping';

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
      if (error instanceof TypeError) {
        const target = this.baseUrl || 'this app origin';
        throw new Error(
          `Network/CORS error contacting ${target}. Check that the ESP32 is reachable. If this app is hosted on another origin, configure a same-origin API proxy; the firmware does not enable cross-origin browser access.`
        );
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
    if (
      !data ||
      !Number.isInteger(data.revision) ||
      !Array.isArray(data.relays) ||
      data.relays.length !== 6 ||
      !data.relays.every(
        (relay, index) =>
          relay &&
          relay.id === index + 1 &&
          typeof relay.state === 'boolean'
      ) ||
      !Number.isFinite(data.uptimeSeconds) ||
      !Number.isFinite(data.wifiRssi) ||
      !Number.isFinite(data.freeHeap)
    ) {
      throw new Error('Malformed status payload received from ESP32.');
    }
    return data;
  }

  async setRelay(channelId: number, state: boolean): Promise<RelayCommandResponseDTO> {
    if (!Number.isInteger(channelId) || channelId < 1 || channelId > 6) {
      throw new Error(`Channel ${channelId} is invalid (must be 1–6).`);
    }

    const result = await this.request<RelayCommandResponseDTO>(`/api/v1/relays/${channelId}`, {
      method: 'PUT',
      body: JSON.stringify({ state })
    });

    if (
      !result ||
      result.success !== true ||
      result.channelId !== channelId ||
      result.state !== state ||
      !Number.isInteger(result.revision)
    ) {
      throw new Error(`Hardware rejected relay ${channelId} actuation.`);
    }

    return result;
  }

  async setAllRelays(state: boolean): Promise<AllRelaysCommandResponseDTO> {
    const result = await this.request<AllRelaysCommandResponseDTO>('/api/v1/relays/all', {
      method: 'PUT',
      body: JSON.stringify({ state })
    });

    if (
      !result ||
      result.success !== true ||
      result.state !== state ||
      !Number.isInteger(result.revision)
    ) {
      throw new Error('Hardware rejected All-Off command.');
    }

    return result;
  }

  async getDeviceInfo(): Promise<DeviceInfoDTO> {
    const data = await this.request<DeviceInfoDTO>('/api/v1/device', { method: 'GET' });
    if (
      !data ||
      !['model', 'firmware', 'chipId', 'mac', 'ip'].every(
        (field) => typeof data[field as keyof DeviceInfoDTO] === 'string'
      )
    ) {
      throw new Error('Malformed device information received from ESP32.');
    }
    return data;
  }

  async getConfiguration(): Promise<ConfigDTO> {
    const data = await this.request<ConfigDTO>('/api/v1/config', { method: 'GET' });
    if (
      !data ||
      typeof data.deviceName !== 'string' ||
      !data.names ||
      typeof data.names !== 'object' ||
      !data.rooms ||
      typeof data.rooms !== 'object'
    ) {
      throw new Error('Malformed configuration payload received from ESP32.');
    }
    return data;
  }

  async updateConfiguration(config: Partial<ConfigDTO>): Promise<ConfigDTO> {
    return this.request<ConfigDTO>('/api/v1/config', {
      method: 'PUT',
      body: JSON.stringify(config)
    });
  }

  async getRelayHardwareConfig(): Promise<RelayHardwareConfigDTO> {
    return parseRelayHardwareConfig(
      await this.request<RelayHardwareConfigDTO>('/api/v1/config/relays', { method: 'GET' })
    );
  }

  async saveRelayGpioMapping(mapping: RelayGpioMappingDTO): Promise<RelayHardwareConfigDTO> {
    const validationError = relayMappingError(mapping.channels);
    if (validationError) throw new Error(validationError);
    return parseRelayHardwareConfig(
      await this.request<RelayHardwareConfigDTO>('/api/v1/config/relays', {
        method: 'PUT',
        body: JSON.stringify(mapping)
      })
    );
  }

  async applyRelayGpioMapping(): Promise<RelayHardwareConfigDTO> {
    return parseRelayHardwareConfig(
      await this.request<RelayHardwareConfigDTO>('/api/v1/config/relays/apply', {
        method: 'POST',
        body: '{}'
      })
    );
  }
}
