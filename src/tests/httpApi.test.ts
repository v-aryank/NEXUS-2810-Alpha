import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpHomePilotApi } from '../api/httpHomePilotApi';

const statusResponse = {
  revision: 3,
  relays: [16, 17, 18, 19, 21, 22].map((_, index) => ({ id: index + 1, state: false })),
  uptimeSeconds: 100,
  wifiRssi: -54,
  freeHeap: 200000
};

const hardwareConfig = {
  board: 'ESP32-WROOM-32 DevKit (esp32dev profile; verify exact board)',
  polarity: 'ACTIVE_HIGH' as const,
  supportedGpios: [16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33],
  activeGpios: [16, 17, 18, 19, 21, 22],
  stagedGpios: null,
  channels: [16, 17, 18, 19, 21, 22].map((gpio, index) => ({ id: index + 1, gpio })),
  allRelaysOff: true,
  commandPending: false,
  stateCertain: true
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HTTP controller API', () => {
  it('reads the firmware status and sends relay commands using the firmware contract', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(statusResponse))
      .mockResolvedValueOnce(jsonResponse({ success: true, channelId: 2, state: true, revision: 4 }))
      .mockResolvedValueOnce(jsonResponse({ success: true, state: false, revision: 5 }));
    vi.stubGlobal('fetch', fetchMock);
    const api = new HttpHomePilotApi('http://controller.local');

    await expect(api.getStatus()).resolves.toEqual(statusResponse);
    await expect(api.setRelay(2, true)).resolves.toMatchObject({ channelId: 2, state: true });
    await expect(api.setAllRelays(false)).resolves.toMatchObject({ state: false });

    expect(fetchMock.mock.calls.map(([url, options]) => [url, options?.method])).toEqual([
      ['http://controller.local/api/v1/status', 'GET'],
      ['http://controller.local/api/v1/relays/2', 'PUT'],
      ['http://controller.local/api/v1/relays/all', 'PUT']
    ]);
    expect(fetchMock.mock.calls[1][1]?.body).toBe(JSON.stringify({ state: true }));
  });

  it('rejects invalid status and command acknowledgements rather than reporting success', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ ...statusResponse, relays: [{ id: 1, state: false }] }))
      .mockResolvedValueOnce(jsonResponse({ success: true, channelId: 1, state: false, revision: 4 }));
    vi.stubGlobal('fetch', fetchMock);
    const api = new HttpHomePilotApi('http://controller.local');

    await expect(api.getStatus()).rejects.toThrow(/Malformed status/);
    await expect(api.setRelay(1, true)).rejects.toThrow(/rejected relay/);
  });

  it('validates GPIO mapping before network submission and parses staged configuration', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({
      ...hardwareConfig,
      stagedGpios: [23, 25, 26, 27, 32, 33]
    }));
    vi.stubGlobal('fetch', fetchMock);
    const api = new HttpHomePilotApi('http://controller.local');

    await expect(api.saveRelayGpioMapping({
      channels: [16, 17, 18, 19, 21, 21].map((gpio, index) => ({ id: index + 1, gpio }))
    })).rejects.toThrow(/assigned/);
    expect(fetchMock).not.toHaveBeenCalled();

    const staged = await api.saveRelayGpioMapping({
      channels: [23, 25, 26, 27, 32, 33].map((gpio, index) => ({ id: index + 1, gpio }))
    });
    expect(staged.stagedGpios).toEqual([23, 25, 26, 27, 32, 33]);
    expect(fetchMock.mock.calls[0][0]).toBe('http://controller.local/api/v1/config/relays');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('PUT');
  });

  it('applies a staged GPIO mapping using the firmware endpoint and empty JSON body', async () => {
    const activeConfig = {
      ...hardwareConfig,
      activeGpios: [23, 25, 26, 27, 32, 33],
      channels: [23, 25, 26, 27, 32, 33].map((gpio, index) => ({ id: index + 1, gpio })),
      stagedGpios: null
    };
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(activeConfig));
    vi.stubGlobal('fetch', fetchMock);
    const api = new HttpHomePilotApi('http://controller.local');

    await expect(api.applyRelayGpioMapping()).resolves.toMatchObject({
      activeGpios: [23, 25, 26, 27, 32, 33],
      stagedGpios: null
    });
    expect(fetchMock.mock.calls[0][0]).toBe('http://controller.local/api/v1/config/relays/apply');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
    expect(fetchMock.mock.calls[0][1]?.body).toBe('{}');
  });

  it('surfaces a firmware apply rejection without reporting a successful mapping', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(
      { success: false, error: 'Cannot apply mapping: a commanded relay is ON' },
      409
    ));
    vi.stubGlobal('fetch', fetchMock);
    const api = new HttpHomePilotApi('http://controller.local');

    await expect(api.applyRelayGpioMapping()).rejects.toThrow(/HTTP 409/);
  });

  it('reports actionable guidance for browser network and CORS failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const api = new HttpHomePilotApi('http://controller.local');
    await expect(api.getStatus()).rejects.toThrow(/same-origin API proxy/);
  });

  it('rejects non-integral channel IDs', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const api = new HttpHomePilotApi('http://controller.local');
    await expect(api.setRelay(1.5, true)).rejects.toThrow(/must be 1–6/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
