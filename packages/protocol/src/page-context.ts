export type CompileMode = 'compact' | 'detailed' | 'agent_action' | 'rag' | 'debug';
export type PrivacyLevel = 'low' | 'medium' | 'strict';

export type LayoutGroupRole =
  | 'lead'
  | 'toc'
  | 'infobox'
  | 'article_section'
  | 'references'
  | 'media'
  | 'card'
  | 'section'
  | 'list'
  | 'nav'
  | 'dialog'
  | 'region'
  | 'generic';

export interface PageSnapshot {
  schemaVersion: 'page_snapshot.v1';
  source: {
    url: string;
    canonicalUrl?: string;
    title: string;
    capturedAt: string;
    language?: string;
  };
  metadata: Record<string, string>;
  headings: HeadingBlock[];
  textBlocks: TextBlock[];
  links: LinkBlock[];
  actions: ActionBlock[];
  layoutGroups: LayoutGroupBlock[];
  forms: FormBlock[];
  tables: TableBlock[];
  media: MediaBlock[];
  stats: DOMStats;
  warnings: ExtractionWarning[];
}

export interface HeadingBlock {
  id: string;
  text: string;
  level: number;
  selectorHint: string;
  sourceOrder: number;
}

export interface TextBlock {
  id: string;
  text: string;
  selectorHint: string;
  sourceOrder: number;
  parentHeadingId?: string;
}

export interface LinkBlock {
  id: string;
  text: string;
  href: string;
  title?: string;
  rel?: string;
  selectorHint: string;
  sourceOrder: number;
}

export interface ActionBlock {
  id: string;
  type: 'button' | 'link' | 'input' | 'select' | 'textarea' | 'form';
  label: string;
  selectorHint: string;
  textContext: string;
  disabled?: boolean;
  required?: boolean;
  sourceOrder: number;
}

export interface LayoutGroupBlock {
  id: string;
  label: string;
  role: LayoutGroupRole;
  text: string;
  selectorHint: string;
  sourceOrder: number;
  childActionIds: string[];
  childMediaIds: string[];
}

export interface FormField {
  id: string;
  name?: string;
  type: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  value?: string;
}

export interface FormBlock {
  id: string;
  selectorHint: string;
  label?: string;
  purpose?: string;
  fields: FormField[];
  submitControls: ActionBlock[];
  sourceOrder: number;
}

export interface TableBlock {
  id: string;
  caption?: string;
  headers: string[];
  rows: string[][];
  selectorHint: string;
  sourceOrder: number;
}

export interface MediaBlock {
  id: string;
  type: 'image' | 'video' | 'audio' | 'canvas' | 'other';
  alt?: string;
  caption?: string;
  src?: string;
  selectorHint: string;
  sourceOrder: number;
}

export interface DOMStats {
  totalNodes: number;
  extractedNodes: number;
  ignoredNodes: number;
  timeElapsedMs: number;
}

export interface ExtractionWarning {
  type:
    | 'shadow_dom'
    | 'iframe'
    | 'node_limit'
    | 'size_limit'
    | 'canvas_only'
    | 'error'
    | 'other';
  message: string;
  details?: string;
}

export type AgentContextSchemaVersion =
  | 'agent_context.compact.v1'
  | 'agent_context.detailed.v1'
  | 'agent_context.agent_action.v1'
  | 'agent_context.rag.v1'
  | 'agent_context.debug.v1';

export interface ModeProfile {
  mode: CompileMode;
  schemaVersion: AgentContextSchemaVersion;
  objective: string;
  includedSections: string[];
  omittedSections: string[];
  tokenTarget: number;
  tokenTolerance: number;
}

export interface AgentContext {
  schemaVersion: AgentContextSchemaVersion;
  compileMode: CompileMode;
  modeProfile: ModeProfile;
  source: SourceInfo;
  pageClassification: PageClassification;
  summary: ContextSummary;
  hierarchy: HeadingNode[];
  mainContent: ContentBlock[];
  actionableElements: ActionElement[];
  layoutGroups: LayoutGroupElement[];
  dataElements: DataElement[];
  links: LinkElement[];
  forms: FormElement[];
  tables: TableElement[];
  media: MediaElement[];
  tokenProfile: TokenProfile;
  privacyReport: PrivacyReport;
  compilerNotes: CompilerNote[];
}

export interface SourceInfo {
  url: string;
  canonicalUrl?: string;
  title: string;
  capturedAt: string;
  language?: string;
  contentHash?: string;
}

export interface PageClassification {
  type:
    | 'article'
    | 'docs'
    | 'dashboard'
    | 'product'
    | 'social'
    | 'form'
    | 'table'
    | 'app'
    | 'unknown';
  confidence: number;
}

export interface ContextSummary {
  short: string;
  method: 'extractive' | 'heuristic' | 'none';
}

export interface HeadingNode {
  id: string;
  text: string;
  level: number;
  children: HeadingNode[];
}

export interface ContentBlock {
  id: string;
  kind:
    | 'heading'
    | 'paragraph'
    | 'list'
    | 'quote'
    | 'code'
    | 'status'
    | 'error'
    | 'other';
  text: string;
  headingPath: string[];
  selectorHint?: string;
  importanceScore: number;
  tokenEstimate: number;
  sourceOrder: number;
}

export interface ActionElement {
  id: string;
  type: 'button' | 'link' | 'input' | 'select' | 'textarea' | 'form';
  label: string;
  selectorHint: string;
  textContext: string;
  actionPurpose: string;
  confidence: number;
  disabled?: boolean;
  required?: boolean;
  privacySensitive?: boolean;
}

export interface LayoutGroupElement {
  id: string;
  label: string;
  role: LayoutGroupRole;
  text: string;
  selectorHint?: string;
  childActionIds: string[];
  childMediaIds: string[];
  importanceScore: number;
}

export interface DataElement {
  id: string;
  label: string;
  value: string;
  selectorHint?: string;
  confidence: number;
}

export interface LinkElement {
  id: string;
  text: string;
  href: string;
  headingPath: string[];
  selectorHint?: string;
}

export interface FormElement {
  id: string;
  selectorHint: string;
  label?: string;
  purpose?: string;
  fields: FormField[];
  submitControls: ActionElement[];
}

export interface TableElement {
  id: string;
  caption?: string;
  headingPath: string[];
  headers: string[];
  rows: string[][];
  truncated?: boolean;
  selectorHint?: string;
}

export interface MediaElement {
  id: string;
  type: 'image' | 'video' | 'audio' | 'canvas' | 'other';
  alt?: string;
  caption?: string;
  src?: string;
  selectorHint?: string;
}

export interface TokenProfile {
  rawEstimatedTokens: number;
  compiledEstimatedTokens: number;
  removedNoiseTokens: number;
  compressionRatio: number;
  budget: number;
  budgetStatus: 'under_budget' | 'near_budget' | 'over_budget_trimmed';
}

export interface PrivacyReport {
  riskLevel: 'low' | 'medium' | 'high';
  redactionLevel: PrivacyLevel;
  redactedItems: RedactedItem[];
  warnings: string[];
  externalSharingAllowed: boolean;
}

export interface RedactedItem {
  type:
    | 'email'
    | 'phone'
    | 'password'
    | 'api_key'
    | 'jwt'
    | 'credit_card_like'
    | 'token'
    | 'other';
  count: number;
  locations: string[];
}

export interface CompilerNote {
  level: 'info' | 'warning' | 'error';
  category:
    | 'deduplication'
    | 'filtering'
    | 'budgeting'
    | 'scoring'
    | 'classification';
  message: string;
}

export interface UserSettings {
  defaultMode: CompileMode;
  privacyLevel: PrivacyLevel;
  tokenBudget: number;
  defaultExport: 'json' | 'markdown' | 'prompt_block';
  debugMode: boolean;
  autoCompile: boolean;
  widgetEnabled: boolean;
  blockedDomains: string[];
}

export interface SiteProfile {
  id: string;
  domain: string;
  preserveSelectors: string[];
  ignoreSelectors: string[];
  mainContentSelector?: string;
  privacyLevelOverride?: PrivacyLevel;
  createdAt: string;
  updatedAt: string;
}

export interface RecentCompileMetadata {
  id: string;
  url: string;
  title: string;
  createdAt: string;
  mode: string;
  tokenCount: number;
  riskLevel: string;
}

export type AgentProvider = 'chatgpt' | 'grok' | 'gemini' | 'claude';

export interface PendingAgentExport {
  provider: AgentProvider;
  text: string;
  createdAt: string;
  sourceTitle?: string;
  sourceUrl?: string;
}

export interface CompileRequest {
  mode: CompileMode;
  privacyLevel: PrivacyLevel;
  tokenBudget: number;
  siteProfile?: SiteProfile;
}

export type CompileResponse =
  | {
      ok: true;
      snapshot: PageSnapshot;
      context: AgentContext;
      exports: {
        json: string;
        markdown: string;
        promptBlock: string;
      };
    }
  | {
      ok: false;
      errorCode: string;
      userMessage: string;
      debug?: unknown;
    };
