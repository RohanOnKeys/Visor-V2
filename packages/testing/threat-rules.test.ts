import { describe, expect, it } from 'vitest';
import { analyzePageRisk } from '@visor/privacy';

describe('migrated V1 threat rules', () => {
  it('marks authentication pages as high risk', () => {
    expect(
      analyzePageRisk(
        'https://example.com/login',
        'Sign in',
        'Enter your password and verification code',
      ).riskLevel,
    ).toBe('high');
  });

  it('marks ordinary article pages as low risk', () => {
    expect(
      analyzePageRisk(
        'https://example.com/articles/visor',
        'Visor architecture',
        'A technical article about browser context.',
      ),
    ).toEqual({ riskLevel: 'low', reasons: [] });
  });
});
