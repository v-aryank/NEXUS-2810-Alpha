import { RelayHardwareConfigDTO, RelayGpioMappingDTO } from './types';

export const SUPPORTED_GPIO_PINS = [16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33] as const;
export const GPIO_SELECTION_MIN = 16;
export const GPIO_SELECTION_MAX = 33;

export function relayMappingError(
  channels: RelayGpioMappingDTO['channels'],
  supportedGpios: readonly number[] = SUPPORTED_GPIO_PINS
): string | null {
  if (channels.length !== 6) return 'Provide exactly six channel assignments.';

  const ids = new Set<number>();
  const pins = new Set<number>();
  for (const { id, gpio } of channels) {
    if (!Number.isInteger(id) || id < 1 || id > 6 || ids.has(id)) {
      return 'Channel IDs must be unique values from 1 through 6.';
    }
    if (
      !Number.isInteger(gpio) ||
      gpio < GPIO_SELECTION_MIN ||
      gpio > GPIO_SELECTION_MAX ||
      !supportedGpios.includes(gpio)
    ) {
      return `GPIO ${gpio} is not supported by this ESP32 board profile.`;
    }
    if (pins.has(gpio)) return `GPIO ${gpio} is assigned to more than one channel.`;
    ids.add(id);
    pins.add(gpio);
  }

  if (ids.size !== 6) return 'Include every channel ID from 1 through 6.';
  return null;
}

export function isRelayHardwareConfig(value: unknown): value is RelayHardwareConfigDTO {
  if (!value || typeof value !== 'object') return false;
  const config = value as Partial<RelayHardwareConfigDTO>;
  if (
    typeof config.board !== 'string' ||
    config.polarity !== 'ACTIVE_HIGH' ||
    !Array.isArray(config.supportedGpios) ||
    !Array.isArray(config.activeGpios) ||
    !Array.isArray(config.channels) ||
    typeof config.allRelaysOff !== 'boolean' ||
    typeof config.commandPending !== 'boolean' ||
    typeof config.stateCertain !== 'boolean'
  ) {
    return false;
  }

  const sameSupportedPins =
    config.supportedGpios.length === SUPPORTED_GPIO_PINS.length &&
    SUPPORTED_GPIO_PINS.every((pin) => config.supportedGpios?.includes(pin));
  if (!sameSupportedPins || config.activeGpios.length !== 6 || config.channels.length !== 6) {
    return false;
  }

  const activeMapping = config.activeGpios.map((gpio, index) => ({ id: index + 1, gpio }));
  if (relayMappingError(activeMapping, config.supportedGpios)) return false;
  if (
    !config.channels.every(
      (channel, index) =>
        channel &&
        channel.id === index + 1 &&
        channel.gpio === config.activeGpios?.[index]
    )
  ) {
    return false;
  }

  if (config.stagedGpios !== undefined && config.stagedGpios !== null) {
    if (!Array.isArray(config.stagedGpios) || config.stagedGpios.length !== 6) return false;
    const stagedMapping = config.stagedGpios.map((gpio, index) => ({ id: index + 1, gpio }));
    if (relayMappingError(stagedMapping, config.supportedGpios)) return false;
  }

  return true;
}

export function parseRelayHardwareConfig(value: unknown): RelayHardwareConfigDTO {
  if (!isRelayHardwareConfig(value)) {
    throw new Error('Malformed relay GPIO configuration received from the controller.');
  }
  return value;
}
