import { z } from 'zod';

export const BridgeProtocolVersionSchema = z.literal('visor_bridge.v1');

export const ExtensionIdentitySchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  protocolVersion: BridgeProtocolVersionSchema,
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
