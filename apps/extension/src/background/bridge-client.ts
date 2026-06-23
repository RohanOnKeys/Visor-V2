import { compileSnapshot } from '@visor/compiler';
import {
  BRIDGE_METHODS,
  BRIDGE_PROTOCOL_VERSION,
  type BridgeEvent,
  type BridgeRequest,
  type BridgeResponse,
  type BrowserObservation,
  type BrowserObserveRequest,
  type BrowserTab,
  type CompileMode,
  type ExtensionHello,
  type ExtensionIdentity,
  type VisorCapabilities,
} from '@visor/protocol';
import {
  BridgeEnvelopeBaseSchema,
  BrowserObserveRequestSchema,
} from '@visor/schemas';
import { loadSettings } from '../storage/settings.js';

const DEFAULT_PORT = 32145;
const MIN_RECONNECT_MS = 500;
const MAX_RECONNECT_MS = 30_000;
const HEARTBEAT_MS = 20_000;

export interface BridgeConnectionConfig {
  token: string;
  port: number;
}

const identity: ExtensionIdentity = {
  name: 'Visor',
  version: '0.1.0',
  protocolVersion: BRIDGE_PROTOCOL_VERSION,
};

const capabilities: VisorCapabilities = {
  observation: true,
  screenshots: false,
  actions: false,
  navigation: false,
  tabs: false,
  confirmations: false,
  autonomousMode: false,
};

export class ExtensionBridgeClient {
  private socket: WebSocket | null = null;
  private reconnectDelay = MIN_RECONNECT_MS;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private stopped = false;

  async start(): Promise<void> {
    this.stopped = false;
    await this.connect();
  }

  stop(): void {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.socket?.close(1000, 'Extension bridge stopped');
    this.socket = null;
  }

  private async connect(): Promise<void> {
    const config = await loadBridgeConnectionConfig();
    if (!config || this.stopped) return;
    const socket = new WebSocket(`ws://127.0.0.1:${config.port}`);
    this.socket = socket;
    socket.addEventListener('open', () => {
      this.reconnectDelay = MIN_RECONNECT_MS;
      socket.send(JSON.stringify(createHello(config.token)));
      this.startHeartbeat(socket);
      void chrome.action.setBadgeText({ text: 'ON' });
      void chrome.action.setBadgeBackgroundColor({ color: '#16a34a' });
    });
    socket.addEventListener('message', (event) => {
      void this.handleMessage(socket, String(event.data));
    });
    socket.addEventListener('close', () => {
      if (socket !== this.socket) return;
      this.socket = null;
      this.stopHeartbeat();
      void chrome.action.setBadgeText({ text: '' });
      this.scheduleReconnect();
    });
    socket.addEventListener('error', () => {
      socket.close();
    });
  }

  private async handleMessage(
    socket: WebSocket,
    serialized: string,
  ): Promise<void> {
    const parsed = parseRequest(serialized);
    if (!parsed) return;
    const response = await dispatchRequest(parsed);
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(response));
    }
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer) return;
    const jitter = Math.floor(Math.random() * Math.max(100, this.reconnectDelay / 3));
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, this.reconnectDelay + jitter);
    this.reconnectDelay = Math.min(
      MAX_RECONNECT_MS,
      this.reconnectDelay * 2,
    );
  }

  private startHeartbeat(socket: WebSocket): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (socket.readyState !== WebSocket.OPEN) return;
      const event: BridgeEvent<typeof BRIDGE_METHODS.bridgePing, object> = {
        protocol: BRIDGE_PROTOCOL_VERSION,
        kind: 'event',
        id: crypto.randomUUID(),
        method: BRIDGE_METHODS.bridgePing,
        sentAt: new Date().toISOString(),
        payload: {},
      };
      socket.send(JSON.stringify(event));
    }, HEARTBEAT_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }
}

export async function loadBridgeConnectionConfig(): Promise<
  BridgeConnectionConfig | undefined
> {
  const result = await chrome.storage.local.get('bridgeConnection');
  const value = result.bridgeConnection;
  if (
    typeof value !== 'object' ||
    value === null ||
    !('token' in value) ||
    typeof value.token !== 'string' ||
    value.token.length < 16
  ) return undefined;
  const port =
    'port' in value && typeof value.port === 'number'
      ? value.port
      : DEFAULT_PORT;
  return { token: value.token, port };
}

export async function saveBridgeConnectionConfig(
  config: BridgeConnectionConfig,
): Promise<void> {
  if (config.token.length < 16) {
    throw new Error('Bridge token must contain at least 16 characters.');
  }
  await chrome.storage.local.set({ bridgeConnection: config });
}

function createHello(
  token: string,
): BridgeEvent<typeof BRIDGE_METHODS.extensionHello, ExtensionHello> {
  return {
    protocol: BRIDGE_PROTOCOL_VERSION,
    kind: 'event',
    id: crypto.randomUUID(),
    method: BRIDGE_METHODS.extensionHello,
    sentAt: new Date().toISOString(),
    payload: { token, identity, capabilities },
  };
}

function parseRequest(serialized: string): BridgeRequest | null {
  try {
    const parsed = BridgeEnvelopeBaseSchema.safeParse(JSON.parse(serialized));
    if (!parsed.success || parsed.data.kind !== 'request') return null;
    return parsed.data as BridgeRequest;
  } catch {
    return null;
  }
}

async function dispatchRequest(
  request: BridgeRequest,
): Promise<BridgeResponse> {
  try {
    let result: unknown;
    if (request.method === BRIDGE_METHODS.browserGetActiveTab) {
      result = await getActiveTab();
    } else if (request.method === BRIDGE_METHODS.browserObserve) {
      result = await observeActiveTab(
        BrowserObserveRequestSchema.parse(request.payload),
      );
    } else {
      return errorResponse(request, 'VALIDATION_ERROR', 'Unknown bridge method.');
    }
    return {
      protocol: BRIDGE_PROTOCOL_VERSION,
      kind: 'response',
      id: request.id,
      method: request.method,
      sentAt: new Date().toISOString(),
      payload: { ok: true, result },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const separator = message.indexOf(':');
    const code = separator > 0 ? message.slice(0, separator) : 'INTERNAL_ERROR';
    return errorResponse(
      request,
      code,
      separator > 0 ? message.slice(separator + 1).trim() : message,
    );
  }
}

async function getActiveTab(): Promise<BrowserTab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('NO_ACTIVE_TAB: Chrome has no active tab.');
  const url = tab.url ?? '';
  return {
    id: `tab_${tab.id}`,
    chromeTabId: tab.id,
    title: tab.title ?? '',
    url,
    active: true,
    accessible: isAccessibleUrl(url),
    status: tab.status,
  };
}

async function observeActiveTab(
  request: BrowserObserveRequest,
): Promise<BrowserObservation> {
  const tab = await getActiveTab();
  if (!tab.accessible) {
    throw new Error(`RESTRICTED_PAGE: Visor cannot access ${tab.url || 'this page'}.`);
  }
  if (request.tabId && request.tabId !== tab.id) {
    throw new Error('TAB_NOT_FOUND: The requested tab is not active.');
  }
  const settings = await loadSettings();
  const mode = toCompileMode(request.mode);
  const response = (await chrome.tabs.sendMessage(tab.chromeTabId, {
    type: 'VISOR_EXTRACT_DOM',
    payload: {
      settings: {
        mode,
        privacyLevel: settings.privacyLevel,
        tokenBudget: request.tokenBudget ?? settings.tokenBudget,
      },
    },
  })) as { ok: boolean; snapshot?: Parameters<typeof compileSnapshot>[0]; error?: string };
  if (!response.ok || !response.snapshot) {
    throw new Error(
      `INTERNAL_ERROR: ${response.error ?? 'DOM extraction failed.'}`,
    );
  }
  const compiled = compileSnapshot(response.snapshot, {
    mode,
    privacyLevel: settings.privacyLevel,
    tokenBudget: request.tokenBudget ?? settings.tokenBudget,
  });
  return {
    tab,
    generation: {
      id: crypto.randomUUID(),
      tabId: tab.chromeTabId,
      frameId: 0,
      documentId: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    },
    context: compiled.context,
    elements: [],
    pageRisk: compiled.context.privacyReport.riskLevel,
    warnings: [
      ...response.snapshot.warnings.map((warning) => warning.message),
      ...compiled.context.privacyReport.warnings,
    ],
  };
}

function toCompileMode(
  mode: BrowserObserveRequest['mode'],
): CompileMode {
  if (mode === 'interactive') return 'agent_action';
  return mode ?? 'detailed';
}

function isAccessibleUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function errorResponse(
  request: BridgeRequest,
  code: string,
  message: string,
): BridgeResponse {
  return {
    protocol: BRIDGE_PROTOCOL_VERSION,
    kind: 'response',
    id: request.id,
    method: request.method,
    sentAt: new Date().toISOString(),
    payload: {
      ok: false,
      error: {
        code,
        message,
        retryable: ['EXTENSION_NOT_CONNECTED', 'TIMEOUT', 'INTERNAL_ERROR'].includes(
          code,
        ),
      },
    },
  };
}
