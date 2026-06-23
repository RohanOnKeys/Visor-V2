import { afterEach, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import {
  ExtensionBridge,
  createVisorMcpServer,
} from '@visor/mcp-server';

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  await Promise.all(cleanups.splice(0).map((cleanup) => cleanup()));
});

describe('read-only MCP tool surface', () => {
  it('lists the three Phase 1 tools and reports disconnected status', async () => {
    const bridge = new ExtensionBridge({
      token: 'mcp-server-test-token-123456',
      port: 0,
    });
    const server = createVisorMcpServer(bridge);
    const client = new Client(
      { name: 'visor-test-client', version: '0.1.0' },
      { capabilities: {} },
    );
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);
    cleanups.push(async () => {
      await client.close();
      await server.close();
      await bridge.close();
    });

    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name).sort()).toEqual([
      'browser_get_active_tab',
      'browser_get_status',
      'browser_observe',
    ]);

    const status = await client.callTool({
      name: 'browser_get_status',
      arguments: {},
    });
    const text =
      status.content[0]?.type === 'text' ? status.content[0].text : '';
    expect(JSON.parse(text).status.connection).toBe('disconnected');
  });

  it('returns a structured tool error when the extension is disconnected', async () => {
    const bridge = new ExtensionBridge({
      token: 'mcp-server-test-token-123456',
      port: 0,
    });
    const server = createVisorMcpServer(bridge);
    const client = new Client(
      { name: 'visor-test-client', version: '0.1.0' },
      { capabilities: {} },
    );
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);
    cleanups.push(async () => {
      await client.close();
      await server.close();
      await bridge.close();
    });

    const result = await client.callTool({
      name: 'browser_get_active_tab',
      arguments: {},
    });
    expect(result.isError).toBe(true);
    expect(
      result.content[0]?.type === 'text' ? result.content[0].text : '',
    ).toContain('EXTENSION_NOT_CONNECTED');
  });
});
