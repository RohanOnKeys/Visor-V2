import { z } from 'zod';
import type { HeadingNode } from '@visor/protocol';

export const LayoutGroupRoleSchema = z.enum([
  'lead',
  'toc',
  'infobox',
  'article_section',
  'references',
  'media',
  'card',
  'section',
  'list',
  'nav',
  'dialog',
  'region',
  'generic',
]);

export const HeadingBlockSchema = z.object({
  id: z.string(),
  text: z.string(),
  level: z.number().int().min(1).max(6),
  selectorHint: z.string(),
  sourceOrder: z.number().int(),
});

export const TextBlockSchema = z.object({
  id: z.string(),
  text: z.string(),
  selectorHint: z.string(),
  sourceOrder: z.number().int(),
  parentHeadingId: z.string().optional(),
});

export const LinkBlockSchema = z.object({
  id: z.string(),
  text: z.string(),
  href: z.string(),
  title: z.string().optional(),
  rel: z.string().optional(),
  selectorHint: z.string(),
  sourceOrder: z.number().int(),
});

export const ActionBlockSchema = z.object({
  id: z.string(),
  type: z.enum(['button', 'link', 'input', 'select', 'textarea', 'form']),
  label: z.string(),
  selectorHint: z.string(),
  textContext: z.string(),
  disabled: z.boolean().optional(),
  required: z.boolean().optional(),
  sourceOrder: z.number().int(),
});

export const LayoutGroupBlockSchema = z.object({
  id: z.string(),
  label: z.string(),
  role: LayoutGroupRoleSchema,
  text: z.string(),
  selectorHint: z.string(),
  sourceOrder: z.number().int(),
  childActionIds: z.array(z.string()),
  childMediaIds: z.array(z.string()),
});

export const FormFieldSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  type: z.string(),
  label: z.string().optional(),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
  disabled: z.boolean().optional(),
  value: z.string().optional(),
});

export const FormBlockSchema = z.object({
  id: z.string(),
  selectorHint: z.string(),
  label: z.string().optional(),
  purpose: z.string().optional(),
  fields: z.array(FormFieldSchema),
  submitControls: z.array(ActionBlockSchema),
  sourceOrder: z.number().int(),
});

export const TableBlockSchema = z.object({
  id: z.string(),
  caption: z.string().optional(),
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
  selectorHint: z.string(),
  sourceOrder: z.number().int(),
});

export const MediaBlockSchema = z.object({
  id: z.string(),
  type: z.enum(['image', 'video', 'audio', 'canvas', 'other']),
  alt: z.string().optional(),
  caption: z.string().optional(),
  src: z.string().optional(),
  selectorHint: z.string(),
  sourceOrder: z.number().int(),
});

export const DOMStatsSchema = z.object({
  totalNodes: z.number().int(),
  extractedNodes: z.number().int(),
  ignoredNodes: z.number().int(),
  timeElapsedMs: z.number(),
});

export const ExtractionWarningSchema = z.object({
  type: z.enum([
    'shadow_dom',
    'iframe',
    'node_limit',
    'size_limit',
    'canvas_only',
    'error',
    'other',
  ]),
  message: z.string(),
  details: z.string().optional(),
});

export const PageSnapshotSchema = z.object({
  schemaVersion: z.literal('page_snapshot.v1'),
  source: z.object({
    url: z.string().url(),
    canonicalUrl: z.string().url().optional(),
    title: z.string(),
    capturedAt: z.string().datetime(),
    language: z.string().optional(),
  }),
  metadata: z.record(z.string()),
  headings: z.array(HeadingBlockSchema),
  textBlocks: z.array(TextBlockSchema),
  links: z.array(LinkBlockSchema),
  actions: z.array(ActionBlockSchema),
  layoutGroups: z.array(LayoutGroupBlockSchema),
  forms: z.array(FormBlockSchema),
  tables: z.array(TableBlockSchema),
  media: z.array(MediaBlockSchema),
  stats: DOMStatsSchema,
  warnings: z.array(ExtractionWarningSchema),
});

export const SourceInfoSchema = z.object({
  url: z.string().url(),
  canonicalUrl: z.string().url().optional(),
  title: z.string(),
  capturedAt: z.string().datetime(),
  language: z.string().optional(),
  contentHash: z.string().optional(),
});

export const PageClassificationSchema = z.object({
  type: z.enum([
    'article',
    'docs',
    'dashboard',
    'product',
    'social',
    'form',
    'table',
    'app',
    'unknown',
  ]),
  confidence: z.number().min(0).max(1),
});

export const ContextSummarySchema = z.object({
  short: z.string(),
  method: z.enum(['extractive', 'heuristic', 'none']),
});

export const HeadingNodeSchema: z.ZodType<HeadingNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    text: z.string(),
    level: z.number().int().min(1).max(6),
    children: z.array(HeadingNodeSchema),
  }),
);

export const ContentBlockSchema = z.object({
  id: z.string(),
  kind: z.enum([
    'heading',
    'paragraph',
    'list',
    'quote',
    'code',
    'status',
    'error',
    'other',
  ]),
  text: z.string(),
  headingPath: z.array(z.string()),
  selectorHint: z.string().optional(),
  importanceScore: z.number(),
  tokenEstimate: z.number(),
  sourceOrder: z.number().int(),
});

export const ActionElementSchema = z.object({
  id: z.string(),
  type: z.enum(['button', 'link', 'input', 'select', 'textarea', 'form']),
  label: z.string(),
  selectorHint: z.string(),
  textContext: z.string(),
  actionPurpose: z.string(),
  confidence: z.number().min(0).max(1),
  disabled: z.boolean().optional(),
  required: z.boolean().optional(),
  privacySensitive: z.boolean().optional(),
});

export const LayoutGroupElementSchema = z.object({
  id: z.string(),
  label: z.string(),
  role: LayoutGroupRoleSchema,
  text: z.string(),
  selectorHint: z.string().optional(),
  childActionIds: z.array(z.string()),
  childMediaIds: z.array(z.string()),
  importanceScore: z.number(),
});

export const DataElementSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  selectorHint: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

export const LinkElementSchema = z.object({
  id: z.string(),
  text: z.string(),
  href: z.string(),
  headingPath: z.array(z.string()),
  selectorHint: z.string().optional(),
});

export const FormElementSchema = z.object({
  id: z.string(),
  selectorHint: z.string(),
  label: z.string().optional(),
  purpose: z.string().optional(),
  fields: z.array(FormFieldSchema),
  submitControls: z.array(ActionElementSchema),
});

export const TableElementSchema = z.object({
  id: z.string(),
  caption: z.string().optional(),
  headingPath: z.array(z.string()),
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
  truncated: z.boolean().optional(),
  selectorHint: z.string().optional(),
});

export const MediaElementSchema = z.object({
  id: z.string(),
  type: z.enum(['image', 'video', 'audio', 'canvas', 'other']),
  alt: z.string().optional(),
  caption: z.string().optional(),
  src: z.string().optional(),
  selectorHint: z.string().optional(),
});

export const TokenProfileSchema = z.object({
  rawEstimatedTokens: z.number().int(),
  compiledEstimatedTokens: z.number().int(),
  removedNoiseTokens: z.number().int(),
  compressionRatio: z.number().min(0).max(1),
  budget: z.number().int(),
  budgetStatus: z.enum([
    'under_budget',
    'near_budget',
    'over_budget_trimmed',
  ]),
});

export const RedactedItemSchema = z.object({
  type: z.enum([
    'email',
    'phone',
    'password',
    'api_key',
    'jwt',
    'credit_card_like',
    'token',
    'other',
  ]),
  count: z.number().int(),
  locations: z.array(z.string()),
});

export const PrivacyReportSchema = z.object({
  riskLevel: z.enum(['low', 'medium', 'high']),
  redactionLevel: z.enum(['low', 'medium', 'strict']),
  redactedItems: z.array(RedactedItemSchema),
  warnings: z.array(z.string()),
  externalSharingAllowed: z.boolean(),
});

export const CompilerNoteSchema = z.object({
  level: z.enum(['info', 'warning', 'error']),
  category: z.enum([
    'deduplication',
    'filtering',
    'budgeting',
    'scoring',
    'classification',
  ]),
  message: z.string(),
});

export const AgentContextSchemaVersionSchema = z.enum([
  'agent_context.compact.v1',
  'agent_context.detailed.v1',
  'agent_context.agent_action.v1',
  'agent_context.rag.v1',
  'agent_context.debug.v1',
]);

export const CompileModeSchema = z.enum([
  'compact',
  'detailed',
  'agent_action',
  'rag',
  'debug',
]);

export const ModeProfileSchema = z.object({
  mode: CompileModeSchema,
  schemaVersion: AgentContextSchemaVersionSchema,
  objective: z.string(),
  includedSections: z.array(z.string()),
  omittedSections: z.array(z.string()),
  tokenTarget: z.number().int(),
  tokenTolerance: z.number().int(),
});

export const AgentContextSchema = z.object({
  schemaVersion: AgentContextSchemaVersionSchema,
  compileMode: CompileModeSchema,
  modeProfile: ModeProfileSchema,
  source: SourceInfoSchema,
  pageClassification: PageClassificationSchema,
  summary: ContextSummarySchema,
  hierarchy: z.array(HeadingNodeSchema),
  mainContent: z.array(ContentBlockSchema),
  actionableElements: z.array(ActionElementSchema),
  layoutGroups: z.array(LayoutGroupElementSchema),
  dataElements: z.array(DataElementSchema),
  links: z.array(LinkElementSchema),
  forms: z.array(FormElementSchema),
  tables: z.array(TableElementSchema),
  media: z.array(MediaElementSchema),
  tokenProfile: TokenProfileSchema,
  privacyReport: PrivacyReportSchema,
  compilerNotes: z.array(CompilerNoteSchema),
});

export const UserSettingsSchema = z.object({
  defaultMode: CompileModeSchema,
  privacyLevel: z.enum(['low', 'medium', 'strict']),
  tokenBudget: z.number().int().min(100),
  defaultExport: z.enum(['json', 'markdown', 'prompt_block']),
  debugMode: z.boolean(),
  autoCompile: z.boolean(),
  widgetEnabled: z.boolean(),
  blockedDomains: z.array(z.string()),
});

export const SiteProfileSchema = z.object({
  id: z.string(),
  domain: z.string(),
  preserveSelectors: z.array(z.string()),
  ignoreSelectors: z.array(z.string()),
  mainContentSelector: z.string().optional(),
  privacyLevelOverride: z.enum(['low', 'medium', 'strict']).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
