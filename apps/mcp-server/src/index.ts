import {
  BRIDGE_PROTOCOL_VERSION,
  type BridgeStatus,
  type VisorCapabilities,
} from '@visor/protocol';
import { pathToFileURL } from 'node:url';
import { startVisorServer } from './server.js';

export { ExtensionBridge, createExtensionHello } from './bridge.js';
export {
  createVisorMcpServer,
  startVisorServer,
  SERVER_NAME,
  SERVER_VERSION,
} from './server.js';

export function getDisconnectedStatus(): BridgeStatus {
  return {
    protocolVersion: BRIDGE_PROTOCOL_VERSION,
    connection: 'disconnected',
    extension: null,
    activeClient: null,
  };
}

export function getInitialCapabilities(): VisorCapabilities {
  return {
    observation: true,
    screenshots: false,
    actions: false,
    navigation: false,
    tabs: false,
    confirmations: false,
    autonomousMode: false,
  };
}

async function main(): Promise<void> {
  const token = process.env.VISOR_BRIDGE_TOKEN;
  if (!token) {
    throw new Error(
      'VISOR_BRIDGE_TOKEN is required and must match the extension pairing token.',
    );
  }
  const port = process.env.VISOR_BRIDGE_PORT
    ? Number.parseInt(process.env.VISOR_BRIDGE_PORT, 10)
    : undefined;
  await startVisorServer({
    bridgeToken: token,
    bridgePort: port,
    allowedExtensionId: process.env.VISOR_EXTENSION_ID,
  });
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(entryPath).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
