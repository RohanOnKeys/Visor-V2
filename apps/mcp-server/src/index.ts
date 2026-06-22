import {
  BRIDGE_PROTOCOL_VERSION,
  type BridgeStatus,
  type VisorCapabilities,
} from '@visor/protocol';

export const SERVER_NAME = 'visor-mcp';
export const SERVER_VERSION = '0.1.0';

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
