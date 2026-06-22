/**
 * V1 compatibility types are migrated here before being split into their
 * long-term compiler, extractor, and settings contracts.
 */
export type LegacyCompileMode =
  | 'compact'
  | 'detailed'
  | 'agent_action'
  | 'rag'
  | 'debug';

export interface LegacyCompileRequest {
  mode: LegacyCompileMode;
  privacyLevel: 'low' | 'medium' | 'strict';
  tokenBudget: number;
  siteProfile?: LegacySiteProfile;
}

export interface LegacySiteProfile {
  id: string;
  domain: string;
  preserveSelectors: string[];
  ignoreSelectors: string[];
  mainContentSelector?: string;
  privacyLevelOverride?: 'low' | 'medium' | 'strict';
  createdAt: string;
  updatedAt: string;
}
