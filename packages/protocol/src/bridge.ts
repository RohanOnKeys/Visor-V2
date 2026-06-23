export const BRIDGE_PROTOCOL_VERSION = 'visor_bridge.v1' as const;

export type BridgeProtocolVersion = typeof BRIDGE_PROTOCOL_VERSION;
export type BridgeMessageKind = 'request' | 'response' | 'event';
export type BridgeConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'degraded';

export interface ExtensionIdentity {
  name: string;
  version: string;
  protocolVersion: BridgeProtocolVersion;
}

export interface ExtensionHello {
  token: string;
  identity: ExtensionIdentity;
  capabilities: VisorCapabilities;
}

export interface McpClientIdentity {
  name: string;
  version?: string;
}

export interface BridgeEnvelope<
  TKind extends BridgeMessageKind,
  TMethod extends string,
  TPayload,
> {
  protocol: BridgeProtocolVersion;
  kind: TKind;
  id: string;
  method: TMethod;
  sentAt: string;
  tabId?: number;
  frameId?: number;
  payload: TPayload;
}

export type BridgeRequest<
  TMethod extends string = string,
  TPayload = unknown,
> = BridgeEnvelope<'request', TMethod, TPayload>;

export type BridgeEvent<
  TMethod extends string = string,
  TPayload = ExtensionIdentity,
> = BridgeEnvelope<'event', TMethod, TPayload>;

export interface BridgeError {
  code: string;
  message: string;
  retryable: boolean;
  details?: unknown;
}

export type BridgeResult<TResult> =
  | { ok: true; result: TResult }
  | { ok: false; error: BridgeError };

export type BridgeResponse<
  TMethod extends string = string,
  TResult = unknown,
> = BridgeEnvelope<'response', TMethod, BridgeResult<TResult>>;

export interface BridgeStatus {
  protocolVersion: BridgeProtocolVersion;
  connection: BridgeConnectionState;
  extension: ExtensionIdentity | null;
  activeClient: McpClientIdentity | null;
}

export interface VisorCapabilities {
  observation: boolean;
  screenshots: boolean;
  actions: boolean;
  navigation: boolean;
  tabs: boolean;
  confirmations: boolean;
  autonomousMode: boolean;
}

export const BRIDGE_METHODS = {
  extensionHello: 'extension.hello',
  extensionReady: 'extension.ready',
  browserGetActiveTab: 'browser.get_active_tab',
  browserObserve: 'browser.observe',
  bridgePing: 'bridge.ping',
} as const;

export type BridgeMethod =
  (typeof BRIDGE_METHODS)[keyof typeof BRIDGE_METHODS];
