import { describe, expect, it } from 'vitest';
import { MockHomePilotApi } from '../api/mockHomePilotApi';
import { relayMappingError, SUPPORTED_GPIO_PINS } from '../api/gpioMapping';

describe('relay GPIO configuration contract', () => {
  it('offers only the firmware-supported GPIO pins in the intended 16–33 range', () => {
    expect(SUPPORTED_GPIO_PINS).toEqual([16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33]);
    expect(SUPPORTED_GPIO_PINS.every((pin) => pin >= 16 && pin <= 33)).toBe(true);
  });

  it('loads the firmware-shaped supported pin list and active assignments', async () => {
    const api = new MockHomePilotApi();
    const config = await api.getRelayHardwareConfig();
    expect(config.supportedGpios).toContain(config.activeGpios[0]);
    expect(config.channels).toHaveLength(6);
    expect(config.polarity).toBe('ACTIVE_HIGH');
    expect(config.stateCertain).toBe(true);
  });

  it.each([
    [16, 17, 18, 19, 21, 34],
    [16, 17, 18, 19, 21, 21],
    [16, 17, 18, 19, 21, 35]
  ])('rejects unsafe or duplicate pin assignments', async (...pins) => {
    const api = new MockHomePilotApi();
    await expect(api.saveRelayGpioMapping({ channels: pins.map((gpio, i) => ({ id: i + 1, gpio })) })).rejects.toThrow();
  });

  it('rejects duplicate and out-of-range channel IDs before staging', async () => {
    const api = new MockHomePilotApi();
    const pins = [16, 17, 18, 19, 21, 22];
    await expect(api.saveRelayGpioMapping({
      channels: pins.map((gpio, index) => ({ id: index === 5 ? 5 : index + 1, gpio }))
    })).rejects.toThrow(/Channel IDs/);
    await expect(api.saveRelayGpioMapping({
      channels: pins.map((gpio, index) => ({ id: index === 5 ? 7 : index + 1, gpio }))
    })).rejects.toThrow(/Channel IDs/);
    expect(relayMappingError(pins.map((gpio, index) => ({ id: index + 1, gpio: index === 5 ? 21 : gpio })))).toMatch(/assigned/);
  });

  it('rejects incomplete mappings and prevents applying while commanded ON', async () => {
    const api = new MockHomePilotApi();
    await expect(api.saveRelayGpioMapping({ channels: [{ id: 1, gpio: 16 }] })).rejects.toThrow();
    await api.saveRelayGpioMapping({ channels: [23, 25, 26, 27, 32, 33].map((gpio, i) => ({ id: i + 1, gpio })) });
    await api.setRelay(1, true);
    await expect(api.applyRelayGpioMapping()).rejects.toThrow(/OFF/);
    await api.setAllRelays(false);
    const result = await api.applyRelayGpioMapping();
    expect(result.activeGpios).toEqual([23, 25, 26, 27, 32, 33]);
    expect(result.stagedGpios).toBeUndefined();
  });
});
