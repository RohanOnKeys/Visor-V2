import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { WebSocket, WebSocketServer } from 'ws';
import {
  BRIDGE_METHODS,
  BRIDGE_PROTOCOL_VERSION,
  type BridgeEnvelope,
  type BridgeEvent,
  type BridgeRequest,
  type BridgeResponse,
  type BridgeStatus,
  type ExtensionHello,
  type ExtensionIdentity,
  type McpClientIdentity,
} from '@visor/protocol';
import {
  BridgeEnvelopeBaseSchema,
  ExtensionHelloSchema,
} from '@visor/schemas';

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export interface ExtensionBridgeOptions {
  token: string;
  port?: number;
  requestTimeoutMs?: number;
  allowedExtensionId?: string;
}

export class ExtensionBridge {
  readonly port: number;
  readonly requestTimeoutMs: number;
  private readonly token: string;
  private readonly allowedExtensionId?: string;
  private server: WebSocketServer | null = null;
  private socket: WebSocket | null = null;
  private extension: ExtensionIdentity | null = null;
  private activeClient: McpClientIdentity | null = null;
  private readonly pending = new Map<string, PendingRequest>();

  constructor(options: ExtensionBridgeOptions) {
    if (options.token.length < 16) {
      throw new Error('VISOR_BRIDGE_TOKEN must contain at least 16 characters.');
    }
    this.token = options.token;
    this.port = options.port ?? 32145;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 10_000;
    this.allowedExtensionId = options.allowedExtensionId;
  }

  async start(): Promise<void> {
    if (this.server) return;
    const server = new WebSocketServer({
      host: '127.0.0.1',
      port: this.port,
      maxPayload: 2 * 1024 * 1024,
      verifyClient: ({ origin }: { origin: string }) =>
        this.isAllowedOrigin(origin),
    });
    this.server = server;
    server.on('connection', (socket) => this.handleConnection(socket));
    await new Promise<void>((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
  }

  async close(): Promise<void> {
    this.rejectPending('Bridge closed.');
    this.socket?.close(1001, 'Server shutting down');
    this.socket = null;
    this.extension = null;
    const server = this.server;
    this.server = null;
    if (!server) return;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  setActiveClient(client: McpClientIdentity | null): void {
    this.activeClient = client;
  }

  getStatus(): BridgeStatus {
    return {
      protocolVersion: BRIDGE_PROTOCOL_VERSION,
      connection:
        this.socket?.readyState === WebSocket.OPEN
          ? 'connected'
          : 'disconnected',
      extension: this.extension,
      activeClient: this.activeClient,
    };
  }

  getListeningPort(): number {
    const address = this.server?.address();
    if (!address || typeof address === 'string') return this.port;
    return (address as AddressInfo).port;
  }

  async request<TResult>(
    method: string,
    payload: unknown,
  ): Promise<TResult> {
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN || !this.extension) {
      throw new Error('EXTENSION_NOT_CONNECTED');
    }
    const id = randomUUID();
    const request: BridgeRequest = {
      protocol: BRIDGE_PROTOCOL_VERSION,
      kind: 'request',
      id,
      method,
      sentAt: new Date().toISOString(),
      payload,
    };
    return new Promise<TResult>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`TIMEOUT: ${method}`));
      }, this.requestTimeoutMs);
      this.pending.set(id, {
        resolve: (value) => resolve(value as TResult),
        reject,
        timeout,
      });
      socket.send(JSON.stringify(request), (error) => {
        if (!error) return;
        clearTimeout(timeout);
        this.pending.delete(id);
        reject(error);
      });
    });
  }

  private isAllowedOrigin(origin: string): boolean {
    if (!origin.startsWith('chrome-extension://')) return false;
    if (!this.allowedExtensionId) return true;
    return origin === `chrome-extension://${this.allowedExtensionId}`;
  }

  private handleConnection(socket: WebSocket): void {
    let authenticated = false;
    const authenticationTimeout = setTimeout(() => {
      if (!authenticated) socket.close(4003, 'Authentication timeout');
    }, 5_000);

    socket.on('message', (data) => {
      const parsed = this.parseEnvelope(data.toString());
      if (!parsed) {
        socket.close(4002, 'Invalid bridge message');
        return;
      }
      if (!authenticated) {
        const hello = this.parseHello(parsed);
        if (!hello || !this.tokensMatch(hello.token)) {
          socket.close(4003, 'Authentication failed');
          return;
        }
        authenticated = true;
        clearTimeout(authenticationTimeout);
        this.socket?.close(4001, 'Replaced by a newer extension connection');
        this.socket = socket;
        this.extension = hello.identity;
        return;
      }
      if (socket !== this.socket || parsed.kind !== 'response') return;
      this.handleResponse(parsed as BridgeResponse);
    });
    socket.on('close', () => {
      clearTimeout(authenticationTimeout);
      if (socket !== this.socket) return;
      this.socket = null;
      this.extension = null;
      this.rejectPending('Extension disconnected.');
    });
    socket.on('error', () => {
      if (socket === this.socket) {
        this.rejectPending('Extension bridge error.');
      }
    });
  }

  private parseEnvelope(
    serialized: string,
  ): BridgeEnvelope<'request' | 'response' | 'event', string, unknown> | null {
    try {
      const parsed = BridgeEnvelopeBaseSchema.safeParse(JSON.parse(serialized));
      return parsed.success
        ? (parsed.data as BridgeEnvelope<
            'request' | 'response' | 'event',
            string,
            unknown
          >)
        : null;
    } catch {
      return null;
    }
  }

  private parseHello(
    envelope: BridgeEnvelope<
      'request' | 'response' | 'event',
      string,
      unknown
    >,
  ): ExtensionHello | null {
    if (
      envelope.kind !== 'event' ||
      envelope.method !== BRIDGE_METHODS.extensionHello
    ) return null;
    const parsed = ExtensionHelloSchema.safeParse(envelope.payload);
    return parsed.success ? parsed.data : null;
  }

  private tokensMatch(candidate: string): boolean {
    const expected = Buffer.from(this.token);
    const received = Buffer.from(candidate);
    return (
      expected.length === received.length &&
      timingSafeEqual(expected, received)
    );
  }

  private handleResponse(response: BridgeResponse): void {
    const pending = this.pending.get(response.id);
    if (!pending) return;
    clearTimeout(pending.timeout);
    this.pending.delete(response.id);
    if (response.payload.ok) {
      pending.resolve(response.payload.result);
    } else {
      pending.reject(
        new Error(
          `${response.payload.error.code}: ${response.payload.error.message}`,
        ),
      );
    }
  }

  private rejectPending(message: string): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error(message));
    }
    this.pending.clear();
  }
}

export function createExtensionHello(
  token: string,
  identity: ExtensionIdentity,
): BridgeEvent<typeof BRIDGE_METHODS.extensionHello, ExtensionHello> {
  return {
    protocol: BRIDGE_PROTOCOL_VERSION,
    kind: 'event',
    id: randomUUID(),
    method: BRIDGE_METHODS.extensionHello,
    sentAt: new Date().toISOString(),
    payload: {
      token,
      identity,
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
