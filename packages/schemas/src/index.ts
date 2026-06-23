import { z } from 'zod';

export * from './v1-context.js';

export const BridgeProtocolVersionSchema = z.literal('visor_bridge.v1');

export const ExtensionIdentitySchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  protocolVersion: BridgeProtocolVersionSchema,
});

export const VisorCapabilitiesSchema = z.object({
  observation: z.boolean(),
  screenshots: z.boolean(),
  actions: z.boolean(),
  navigation: z.boolean(),
  tabs: z.boolean(),
  confirmations: z.boolean(),
  autonomousMode: z.boolean(),
});

export const ExtensionHelloSchema = z.object({
  token: z.string().min(16),
  identity: ExtensionIdentitySchema,
  capabilities: VisorCapabilitiesSchema,
});

export const BridgeErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  retryable: z.boolean(),
  details: z.unknown().optional(),
});

export const ObservationModeSchema = z.enum([
  'compact',
  'detailed',
  'interactive',
  'rag',
  'debug',
]);

export const BrowserObserveRequestSchema = z.object({
  tabId: z.string().optional(),
  mode: ObservationModeSchema.default('interactive'),
  tokenBudget: z.number().int().min(500).max(100_000).optional(),
  includeScreenshot: z.boolean().default(false),
  sinceGeneration: z.string().optional(),
});

export const InteractionModeSchema = z.enum([
  'observe',
  'confirm',
  'autonomous',
]);

export const BridgeEnvelopeBaseSchema = z.object({
  protocol: BridgeProtocolVersionSchema,
  kind: z.enum(['request', 'response', 'event']),
  id: z.string().min(1),
  method: z.string().min(1),
  sentAt: z.string().datetime(),
  tabId: z.number().int().optional(),
  frameId: z.number().int().optional(),
  payload: z.unknown(),
});

export const BrowserTabSchema = z.object({
  id: z.string().min(1),
  chromeTabId: z.number().int(),
  title: z.string(),
  url: z.string(),
  active: z.boolean(),
  accessible: z.boolean(),
  status: z.string().optional(),
});
