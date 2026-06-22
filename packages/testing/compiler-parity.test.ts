import { describe, expect, it } from 'vitest';
import {
  cleanLabel,
  estimateTokenCount,
  normalizeText,
  normalizeUrl,
} from '@visor/compiler';

describe('migrated V1 compiler utilities', () => {
  it('normalizes whitespace deterministically', () => {
    expect(normalizeText('  Visor \n  sees\tstructure  ')).toBe(
      'Visor sees structure',
    );
  });

  it('removes URL fragments without discarding query parameters', () => {
    expect(normalizeUrl('https://example.com/page?q=visor#section')).toBe(
      'https://example.com/page?q=visor',
    );
  });

  it('cleans trailing label punctuation', () => {
    expect(cleanLabel('Email address:')).toBe('Email address');
  });

  it('retains the V1 deterministic token estimate', () => {
    expect(estimateTokenCount('12345678')).toBe(2);
  });
});
