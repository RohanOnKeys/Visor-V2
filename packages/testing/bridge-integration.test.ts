import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { ExtensionBridge } from '@visor/mcp-server';
import {
  BRIDGE_METHODS,
  BRIDGE_PROTOCOL_VERSION,
  type BridgeRequest,
  type BridgeResponse,
} from '@visor/protocol';

const token = 'phase-1-test-token-1234567890';
const bridges: ExtensionBridge[] = [];
const sockets: WebSocket[] = [];

afterEach(async () => {
  sockets.splice(0).forEach((socket) => socket.close());
  await Promise.all(bridges.splice(0).map((bridge) => bridge.close()));
});

describe('authenticated localhost extension bridge', () => {
  it('authenticates an extension and correlates request responses', async () => {
    const bridge = new ExtensionBridge({ token, port: 0, requestTimeoutMs: 1000 });
    bridges.push(bridge);
    await bridge.start();
    const socket = await connect(bridge.getListeningPort());
    sockets.push(socket);
    socket.send(JSON.stringify(hello(token)));
    await waitFor(() => bridge.getStatus().connection === 'connected');

    socket.on('message', (data) => {
      const request = JSON.parse(data.toString()) as BridgeRequest;
      const response: BridgeResponse = {
        protocol: BRIDGE_PROTOCOL_VERSION,
        kind: 'response',
        id: request.id,
        method: request.method,
        sentAt: new Date().toISOString(),
        payload: { ok: true, result: { id: 'tab_7' } },
      };
      socket.send(JSON.stringify(response));
    });

    await expect(
      bridge.request(BRIDGE_METHODS.browserGetActiveTab, {}),
    ).resolves.toEqual({ id: 'tab_7' });
    expect(bridge.getStatus().extension?.name).toBe('Visor Test');
  });

  it('rejects invalid tokens', async () => {
    const bridge = new ExtensionBridge({ token, port: 0 });
    bridges.push(bridge);
    await bridge.start();
    const socket = await connect(bridge.getListeningPort());
    sockets.push(socket);
    const closed = new Promise<number>((resolve) =>
      socket.once('close', (code) => resolve(code)),
    );
    socket.send(JSON.stringify(hello('wrong-token-that-is-long-enough')));
    await expect(closed).resolves.toBe(4003);
    expect(bridge.getStatus().connection).toBe('disconnected');
  });

  it('rejects ordinary webpage origins', async () => {
    const bridge = new ExtensionBridge({ token, port: 0 });
    bridges.push(bridge);
    await bridge.start();
    await expect(
      connect(bridge.getListeningPort(), 'https://example.com'),
    ).rejects.toThrow();
  });
});

function hello(value: string) {
  return {
    protocol: BRIDGE_PROTOCOL_VERSION,
    kind: 'event',
    id: crypto.randomUUID(),
    method: BRIDGE_METHODS.extensionHello,
    sentAt: new Date().toISOString(),
    payload: {
      token: value,
      identity: {
        name: 'Visor Test',
        version: '0.1.0',
        protocolVersion: BRIDGE_PROTOCOL_VERSION,
      },
      capabilities: {
        observation: true,
        screenshots: false,
        actions: false,
        navigation: false,
        tabs: false,
        confirmations: false,
        autonomousMode: false,
      },
    },
  };
}

function connect(
  port: number,
  origin = 'chrome-extension://abcdefghijklmnop',
): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}`, { origin });
    socket.once('open', () => resolve(socket));
    socket.once('error', reject);
  });
}

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('Condition was not met before timeout.');
}
