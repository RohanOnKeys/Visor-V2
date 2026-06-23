export type InteractionMode = 'observe' | 'confirm' | 'autonomous';

export type ObservationMode =
  | 'compact'
  | 'detailed'
  | 'interactive'
  | 'rag'
  | 'debug';

export interface ObservationGeneration {
  id: string;
  tabId: number;
  frameId: number;
  documentId: string;
  createdAt: string;
}

export interface ElementReference {
  id: string;
  generationId: string;
  role?: string;
  tagName: string;
  label: string;
  selectorHint?: string;
  frameId: number;
  visible: boolean;
  enabled: boolean;
  privacySensitive: boolean;
  risk: 'low' | 'medium' | 'high';
}

export interface BrowserTab {
  id: string;
  chromeTabId: number;
  title: string;
  url: string;
  active: boolean;
  accessible: boolean;
  status?: string;
}

export interface BrowserObserveRequest {
  tabId?: string;
  mode?: ObservationMode;
  tokenBudget?: number;
  includeScreenshot?: boolean;
  sinceGeneration?: string;
}

export interface BrowserObservation<TContext = unknown> {
  tab: BrowserTab;
  generation: ObservationGeneration;
  context: TContext;
  elements: ElementReference[];
  pageRisk: 'low' | 'medium' | 'high';
  warnings: string[];
}

export type ActionStatus =
  | 'completed'
  | 'blocked'
  | 'confirmation_required'
  | 'failed';

export interface ActionResult {
  actionId: string;
  status: ActionStatus;
  startedAt: string;
  completedAt: string;
  pageChanged: boolean;
  navigationOccurred: boolean;
  resultingGeneration?: string;
  warnings: string[];
}
