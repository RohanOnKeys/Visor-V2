import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { BRIDGE_METHODS } from '@visor/protocol';
import { BrowserObserveRequestSchema } from '@visor/schemas';
import { z } from 'zod';
import { ExtensionBridge } from './bridge.js';

export const SERVER_NAME = 'visor-mcp';
export const SERVER_VERSION = '0.1.0';

export interface VisorServerOptions {
  bridgeToken: string;
  bridgePort?: number;
  allowedExtensionId?: string;
}

export function createVisorMcpServer(bridge: ExtensionBridge): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  server.registerTool(
    'browser_get_status',
    {
      description:
        'Return the local Visor bridge connection state and read-only capabilities.',
      inputSchema: z.object({}),
    },
    async () => toolResult({
      status: bridge.getStatus(),
      capabilities: {
        observation: true,
        screenshots: false,
        actions: false,
        navigation: false,
        tabs: false,
        confirmations: false,
        autonomousMode: false,
      },
    }),
  );

  server.registerTool(
    'browser_get_active_tab',
    {
      description:
        'Return the active accessible Chrome tab connected through Visor.',
      inputSchema: z.object({}),
    },
    async () =>
      runBridgeTool(() =>
        bridge.request(BRIDGE_METHODS.browserGetActiveTab, {}),
      ),
  );

  server.registerTool(
    'browser_observe',
    {
      description:
        'Observe the active Chrome tab as validated, privacy-filtered structured context.',
      inputSchema: BrowserObserveRequestSchema,
    },
    async (input) =>
      runBridgeTool(() =>
        bridge.request(
          BRIDGE_METHODS.browserObserve,
          BrowserObserveRequestSchema.parse(input),
        ),
      ),
  );

  return server;
}

export async function startVisorServer(
  options: VisorServerOptions,
): Promise<{ bridge: ExtensionBridge; server: McpServer }> {
  const bridge = new ExtensionBridge({
    token: options.bridgeToken,
    port: options.bridgePort,
    allowedExtensionId: options.allowedExtensionId,
  });
  await bridge.start();
  const server = createVisorMcpServer(bridge);
  await server.connect(new StdioServerTransport());
  return { bridge, server };
}

function toolResult(value: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      },
    ],
    structuredContent:
      typeof value === 'object' && value !== null
        ? (value as Record<string, unknown>)
        : { value },
  };
}

async function runBridgeTool(operation: () => Promise<unknown>) {
  try {
    return toolResult(await operation());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text' as const, text: message }],
      isError: true,
    };
  }
}
