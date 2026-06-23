import { describe, expect, it } from 'vitest';
import { compileSnapshot } from '@visor/compiler';
import type { PageSnapshot } from '@visor/protocol';

function snapshot(overrides: Partial<PageSnapshot> = {}): PageSnapshot {
  const longText = Array.from(
    { length: 80 },
    (_, index) => `RAG sentence ${index} with useful article context.`,
  ).join(' ');
  return {
    schemaVersion: 'page_snapshot.v1',
    source: {
      url: 'https://example.com/docs',
      title: 'Compiler Fixture',
      capturedAt: '2026-06-14T10:00:00.000Z',
      language: 'en',
    },
    metadata: {},
    headings: [
      {
        id: 'heading-1',
        text: 'Main Documentation',
        level: 1,
        selectorHint: 'main > h1',
        sourceOrder: 1,
      },
    ],
    textBlocks: [
      {
        id: 'text-1',
        text: longText,
        selectorHint: 'main > article > p',
        sourceOrder: 2,
        parentHeadingId: 'heading-1',
      },
      {
        id: 'text-duplicate',
        text: longText,
        selectorHint: 'main > article > p:nth-child(2)',
        sourceOrder: 3,
        parentHeadingId: 'heading-1',
      },
      {
        id: 'noise-1',
        text: 'Subscribe to our newsletter and accept this cookie banner.',
        selectorHint: 'div.cookie-consent-banner > p',
        sourceOrder: 4,
      },
    ],
    links: [],
    actions: [],
    layoutGroups: [],
    forms: [],
    tables: [],
    media: [],
    stats: {
      totalNodes: 10,
      extractedNodes: 4,
      ignoredNodes: 6,
      timeElapsedMs: 4,
    },
    warnings: [],
    ...overrides,
  };
}

describe('V1 compiler mode parity', () => {
  it('emits a distinct schema and profile for every mode', () => {
    for (const mode of [
      'compact',
      'detailed',
      'agent_action',
      'rag',
      'debug',
    ] as const) {
      const result = compileSnapshot(snapshot(), {
        mode,
        privacyLevel: 'medium',
        tokenBudget: 4000,
      });
      expect(result.context.schemaVersion).toBe(`agent_context.${mode}.v1`);
      expect(result.context.modeProfile.mode).toBe(mode);
      expect(result.context.modeProfile.tokenTolerance).toBe(100);
    }
  });

  it('emits stable chunks in RAG mode', () => {
    const result = compileSnapshot(snapshot(), {
      mode: 'rag',
      privacyLevel: 'medium',
      tokenBudget: 4000,
    });
    expect(result.context.mainContent.length).toBeGreaterThan(1);
    expect(
      result.context.mainContent.every((block) => block.id.includes('-chunk-')),
    ).toBe(true);
    expect(result.context.mainContent[0]?.headingPath).toEqual([
      'Main Documentation',
    ]);
  });

  it('retains duplicate and noisy blocks only in debug mode', () => {
    const detailed = compileSnapshot(snapshot(), {
      mode: 'detailed',
      privacyLevel: 'medium',
      tokenBudget: 4000,
    });
    const debug = compileSnapshot(snapshot(), {
      mode: 'debug',
      privacyLevel: 'medium',
      tokenBudget: 4000,
    });
    expect(detailed.context.mainContent.map((block) => block.id)).not.toContain(
      'noise-1',
    );
    expect(debug.context.mainContent.map((block) => block.id)).toEqual(
      expect.arrayContaining(['text-duplicate', 'noise-1']),
    );
  });

  it('clips content near a pressured token budget', () => {
    const result = compileSnapshot(snapshot(), {
      mode: 'detailed',
      privacyLevel: 'medium',
      tokenBudget: 500,
    });
    expect(result.context.tokenProfile.compiledEstimatedTokens).toBeLessThanOrEqual(
      500,
    );
    expect(result.context.tokenProfile.compiledEstimatedTokens).toBeGreaterThanOrEqual(
      400,
    );
    expect(
      result.context.compilerNotes.some((note) =>
        note.message.includes('clipped block'),
      ),
    ).toBe(true);
  });

  it('removes controls from RAG and preserves them in agent mode', () => {
    const structured = snapshot({
      actions: [
        {
          id: 'action-submit',
          type: 'button',
          label: 'Continue checkout',
          selectorHint: 'button.checkout',
          textContext: 'Continue checkout',
          sourceOrder: 5,
        },
      ],
      forms: [
        {
          id: 'form-checkout',
          selectorHint: 'form.checkout',
          purpose: 'checkout',
          fields: [],
          submitControls: [],
          sourceOrder: 6,
        },
      ],
      layoutGroups: [
        {
          id: 'group-action',
          label: 'Checkout',
          role: 'card',
          text: 'Continue checkout and submit payment.',
          selectorHint: '.checkout-card',
          sourceOrder: 7,
          childActionIds: ['action-submit'],
          childMediaIds: [],
        },
      ],
    });
    const rag = compileSnapshot(structured, {
      mode: 'rag',
      privacyLevel: 'medium',
      tokenBudget: 4000,
    });
    const agent = compileSnapshot(structured, {
      mode: 'agent_action',
      privacyLevel: 'medium',
      tokenBudget: 4000,
    });
    expect(rag.context.forms).toHaveLength(0);
    expect(rag.context.actionableElements).toHaveLength(0);
    expect(agent.context.forms).toHaveLength(1);
    expect(agent.context.actionableElements).toHaveLength(1);
    expect(agent.context.layoutGroups[0]?.id).toBe('group-action');
  });

  it('redacts structured values and omits passwords', () => {
    const result = compileSnapshot(
      snapshot({
        links: [
          {
            id: 'link-secret',
            text: 'Email rohan@example.com',
            href: 'https://example.com/?email=rohan@example.com',
            selectorHint: 'main > a',
            sourceOrder: 5,
          },
        ],
        forms: [
          {
            id: 'form-secret',
            selectorHint: 'form',
            fields: [
              {
                id: 'field-password',
                type: 'password',
                value: 'never-output-this',
              },
            ],
            submitControls: [],
            sourceOrder: 6,
          },
        ],
        tables: [
          {
            id: 'table-secret',
            headers: ['Phone'],
            rows: [['555-123-4567']],
            selectorHint: 'table',
            sourceOrder: 7,
          },
        ],
      }),
      { mode: 'detailed', privacyLevel: 'strict', tokenBudget: 4000 },
    );
    expect(result.exports.json).not.toContain('rohan@example.com');
    expect(result.exports.json).not.toContain('555-123-4567');
    expect(result.exports.json).not.toContain('never-output-this');
    expect(result.context.privacyReport.externalSharingAllowed).toBe(false);
  });
});
