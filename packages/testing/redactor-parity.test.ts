import { describe, expect, it } from 'vitest';
import { applyRedaction } from '@visor/privacy';
import type { ContentBlock } from '@visor/protocol';

const blocks = (text: string): ContentBlock[] => [
  {
    id: 'block-1',
    kind: 'paragraph',
    text,
    headingPath: [],
    importanceScore: 5,
    tokenEstimate: 20,
    sourceOrder: 1,
  },
];

describe('V1 privacy redactor parity', () => {
  it('always redacts JWTs and API keys', () => {
    const result = applyRedaction(
      blocks(
        'Key sk-proj-123456789012345678901234567890123456789012345678 token eyJhbGciOiJIUzI1NiJ9.x.y',
      ),
      'low',
    );

    expect(result.redactedBlocks[0]?.text).toContain('[REDACTED_API_KEY]');
    expect(result.redactedBlocks[0]?.text).toContain('[REDACTED_JWT]');
    expect(result.privacyReport.riskLevel).toBe('high');
  });

  it('redacts email at medium and phone at strict privacy', () => {
    expect(
      applyRedaction(blocks('rohan@example.com 555-123-4567'), 'medium')
        .redactedBlocks[0]?.text,
    ).toBe('[REDACTED_EMAIL] 555-123-4567');
    expect(
      applyRedaction(blocks('rohan@example.com 555-123-4567'), 'strict')
        .redactedBlocks[0]?.text,
    ).toBe('[REDACTED_EMAIL] [REDACTED_PHONE]');
  });

  it('uses page source when evaluating risk', () => {
    const result = applyRedaction(blocks('Welcome back.'), 'medium', {
      url: 'https://bank.example.com/dashboard',
      title: 'Account Dashboard',
    });

    expect(result.privacyReport.riskLevel).toBe('high');
    expect(result.privacyReport.externalSharingAllowed).toBe(false);
    expect(
      result.privacyReport.warnings.some((warning) =>
        warning.includes('Financial'),
      ),
    ).toBe(true);
  });
});
