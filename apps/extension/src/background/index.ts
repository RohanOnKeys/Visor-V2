import {
  BRIDGE_PROTOCOL_VERSION,
  type BridgeEvent,
  type ExtensionIdentity,
} from '@visor/protocol';

export const extensionIdentity: ExtensionIdentity = {
  name: 'Visor',
  version: '0.1.0',
  protocolVersion: BRIDGE_PROTOCOL_VERSION,
};

export function createReadyEvent(): BridgeEvent<'extension.ready'> {
  return {
    protocol: BRIDGE_PROTOCOL_VERSION,
    kind: 'event',
    id: crypto.randomUUID(),
    method: 'extension.ready',
    sentAt: new Date().toISOString(),
    payload: extensionIdentity,
  };
}
