import { describe, it, expect, beforeEach } from 'vitest';
import { MockHomePilotApi } from '../api/mockHomePilotApi';
import { HttpHomePilotApi } from '../api/httpHomePilotApi';

describe('NEXUS-2810 Controller Architecture & Safety Verification', () => {
  let mockApi: MockHomePilotApi;

  beforeEach(() => {
    mockApi = new MockHomePilotApi();
  });

  it('verifies that all 6 channels initialize OFF', async () => {
    const status = await mockApi.getStatus();
    expect(status.relays).toHaveLength(6);
    expect(status.relays.every((r) => r.state === false)).toBe(true);
  });

  it('performs explicit ON and OFF switching with revision increment', async () => {
    const initialStatus = await mockApi.getStatus();
    const initialRev = initialStatus.revision;

    const onResponse = await mockApi.setRelay(4, true);
    expect(onResponse.success).toBe(true);
    expect(onResponse.channelId).toBe(4);
    expect(onResponse.state).toBe(true);
    expect(onResponse.revision).toBeGreaterThan(initialRev);

    let status = await mockApi.getStatus();
    expect(status.relays.find((r) => r.id === 4)?.state).toBe(true);
    expect(status.relays.find((r) => r.id === 1)?.state).toBe(false);

    const offResponse = await mockApi.setRelay(4, false);
    expect(offResponse.success).toBe(true);
    expect(offResponse.state).toBe(false);

    status = await mockApi.getStatus();
    expect(status.relays.find((r) => r.id === 4)?.state).toBe(false);
  });

  it('executes All-Off command across all channels', async () => {
    await mockApi.setRelay(1, true);
    await mockApi.setRelay(2, true);
    await mockApi.setRelay(6, true);

    let status = await mockApi.getStatus();
    expect(status.relays.filter((r) => r.state).length).toBe(3);

    const allOffResult = await mockApi.setAllRelays(false);
    expect(allOffResult.success).toBe(true);
    expect(allOffResult.state).toBe(false);

    status = await mockApi.getStatus();
    expect(status.relays.every((r) => r.state === false)).toBe(true);
  });

  it('ensures HttpHomePilotApi aborts on timeout and never simulates success', async () => {
    const httpClient = new HttpHomePilotApi('http://127.0.0.1:54321', 100);

    await expect(httpClient.getStatus()).rejects.toThrow(
      /Controller communication failure|Network\/CORS error|timed out/
    );
    await expect(httpClient.setRelay(1, true)).rejects.toThrow(
      /Controller communication failure|Network\/CORS error|timed out/
    );
  });

  it('ensures channel ID range validation (1–6)', async () => {
    await expect(mockApi.setRelay(0, true)).rejects.toThrow('out of bounds');
    await expect(mockApi.setRelay(7, true)).rejects.toThrow('out of bounds');
  });
});
