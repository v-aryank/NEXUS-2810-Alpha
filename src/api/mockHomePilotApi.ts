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
import { parseRelayHardwareConfig, relayMappingError, SUPPORTED_GPIO_PINS } from './gpioMapping';

export class MockHomePilotApi implements IHomePilotApi {
  private revision = 100;
  private relays: boolean[] = [false, false, false, false, false, false];
  private uptime = 18420;
  private latencyMs = 220;
  private hardwareConfig: RelayHardwareConfigDTO = {
    board: 'ESP32-WROOM-32 DevKit (assumed)', polarity: 'ACTIVE_HIGH',
    supportedGpios: [...SUPPORTED_GPIO_PINS],
    activeGpios: [16, 17, 18, 19, 21, 22], channels: [16,17,18,19,21,22].map((gpio, i) => ({ id: i + 1, gpio })),
    allRelaysOff: true, commandPending: false, stateCertain: true
  };

  private config: ConfigDTO = {
    deviceName: 'NEXUS-2810-Alpha-ESP32',
    names: {
      '1': 'Bedroom Light',
      '2': 'Ceiling Fan',
      '3': 'Study Lamp',
      '4': 'Living Room Light',
      '5': 'Power Outlet',
      '6': 'Spare Channel'
    },
    rooms: {
      '1': 'Master Bedroom',
      '2': 'Master Bedroom',
      '3': 'Office',
      '4': 'Living Room',
      '5': 'Kitchen',
      '6': 'Utility'
    }
  };

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getStatus(): Promise<StatusResponseDTO> {
    await this.delay(this.latencyMs);
    this.uptime += 3;
    return {
      revision: this.revision,
      relays: this.relays.map((state, idx) => ({ id: idx + 1, state })),
      uptimeSeconds: this.uptime,
      wifiRssi: -62,
      freeHeap: 181240
    };
  }

  async setRelay(channelId: number, state: boolean): Promise<RelayCommandResponseDTO> {
    if (!Number.isInteger(channelId) || channelId < 1 || channelId > 6) {
      throw new Error(`Channel ID ${channelId} out of bounds (1-6)`);
    }
    await this.delay(this.latencyMs);
    this.relays[channelId - 1] = state;
    this.revision++;
    return { success: true, channelId, state, revision: this.revision };
  }

  async setAllRelays(state: boolean): Promise<AllRelaysCommandResponseDTO> {
    await this.delay(this.latencyMs);
    this.relays = this.relays.map(() => state);
    this.revision++;
    return { success: true, state, revision: this.revision };
  }

  async getDeviceInfo(): Promise<DeviceInfoDTO> {
    await this.delay(this.latencyMs);
    return {
      model: 'ESP32-WROOM-32 (6-Ch Relay)',
      firmware: 'NEXUS-FW v2.8.1-alpha',
      chipId: '98:F4:AB:12:DF:8C',
      mac: '98:F4:AB:12:DF:8C',
      ip: '192.168.1.185 (Simulated)'
    };
  }

  async getConfiguration(): Promise<ConfigDTO> {
    await this.delay(this.latencyMs);
    return JSON.parse(JSON.stringify(this.config));
  }

  async updateConfiguration(newConfig: Partial<ConfigDTO>): Promise<ConfigDTO> {
    await this.delay(this.latencyMs);
    this.config = {
      ...this.config,
      ...newConfig,
      names: { ...this.config.names, ...(newConfig.names || {}) },
      rooms: { ...this.config.rooms, ...(newConfig.rooms || {}) }
    };
    return JSON.parse(JSON.stringify(this.config));
  }

  async getRelayHardwareConfig(): Promise<RelayHardwareConfigDTO> {
    await this.delay(this.latencyMs);
    return parseRelayHardwareConfig(JSON.parse(JSON.stringify(this.hardwareConfig)));
  }

  async saveRelayGpioMapping(mapping: RelayGpioMappingDTO): Promise<RelayHardwareConfigDTO> {
    await this.delay(this.latencyMs);
    const validationError = relayMappingError(mapping.channels, this.hardwareConfig.supportedGpios);
    if (validationError) throw new Error(validationError);
    this.hardwareConfig.stagedGpios = [...mapping.channels]
      .sort((left, right) => left.id - right.id)
      .map((channel) => channel.gpio);
    return this.getRelayHardwareConfig();
  }

  async applyRelayGpioMapping(): Promise<RelayHardwareConfigDTO> {
    await this.delay(this.latencyMs);
    if (this.relays.some(Boolean)) throw new Error('All commanded relay states must be OFF before applying.');
    if (this.hardwareConfig.stagedGpios) {
      this.hardwareConfig.activeGpios = [...this.hardwareConfig.stagedGpios];
      this.hardwareConfig.channels = this.hardwareConfig.activeGpios.map((gpio, i) => ({ id: i + 1, gpio }));
      delete this.hardwareConfig.stagedGpios;
    }
    return this.getRelayHardwareConfig();
  }
}
