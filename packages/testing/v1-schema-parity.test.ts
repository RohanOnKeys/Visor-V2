import { describe, expect, it } from 'vitest';
import { PageSnapshotSchema, UserSettingsSchema } from '@visor/schemas';

describe('V1 schema parity', () => {
  it('validates V1 settings', () => {
    expect(
      UserSettingsSchema.safeParse({
        defaultMode: 'compact',
        privacyLevel: 'medium',
        tokenBudget: 4000,
        defaultExport: 'json',
        debugMode: false,
        autoCompile: true,
        widgetEnabled: true,
        blockedDomains: ['test.com'],
      }).success,
    ).toBe(true);
  });

  it('validates a V1 page snapshot', () => {
    expect(
      PageSnapshotSchema.safeParse({
        schemaVersion: 'page_snapshot.v1',
        source: {
          url: 'https://example.com/test',
          title: 'Test Title',
          capturedAt: new Date().toISOString(),
        },
        metadata: { key: 'value' },
        headings: [],
        textBlocks: [],
        links: [],
        actions: [],
        layoutGroups: [],
        forms: [],
        tables: [],
        media: [],
        stats: {
          totalNodes: 10,
          extractedNodes: 1,
          ignoredNodes: 9,
          timeElapsedMs: 1.5,
        },
        warnings: [],
      }).success,
    ).toBe(true);
  });
});
