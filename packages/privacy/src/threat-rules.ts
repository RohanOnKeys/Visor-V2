// Migrated and normalized from Visor v1 src/privacy/threatRules.ts.
export interface ThreatAnalysis {
  riskLevel: 'low' | 'medium' | 'high';
  reasons: string[];
}

const HIGH_RISK_URL_PATTERNS = [
  /\/login(?:\/|$)/i,
  /\/signin(?:\/|$)/i,
  /\/checkout(?:\/|$)/i,
  /\/payment(?:\/|$)/i,
  /\/billing(?:\/|$)/i,
  /\/account\/security(?:\/|$)/i,
];

const HIGH_RISK_TEXT_PATTERNS = [
  /\bpassword\b/i,
  /\bone[- ]?time (?:password|code)\b/i,
  /\bverification code\b/i,
  /\bcredit card\b/i,
  /\bsecurity settings\b/i,
];

const MEDIUM_RISK_TEXT_PATTERNS = [
  /\bemail address\b/i,
  /\bphone number\b/i,
  /\bshipping address\b/i,
  /\baccount settings\b/i,
];

export function analyzePageRisk(
  url: string,
  title: string,
  textSnippet: string,
): ThreatAnalysis {
  const reasons: string[] = [];
  const combinedText = `${title}\n${textSnippet}`;

  if (HIGH_RISK_URL_PATTERNS.some((pattern) => pattern.test(url))) {
    reasons.push('The page URL indicates an authentication, payment, or security flow.');
  }

  if (HIGH_RISK_TEXT_PATTERNS.some((pattern) => pattern.test(combinedText))) {
    reasons.push('The page contains high-risk authentication or financial language.');
  }

  if (reasons.length > 0) {
    return { riskLevel: 'high', reasons };
  }

  if (MEDIUM_RISK_TEXT_PATTERNS.some((pattern) => pattern.test(combinedText))) {
    return {
      riskLevel: 'medium',
      reasons: ['The page may contain personal or account information.'],
    };
  }

  return { riskLevel: 'low', reasons: [] };
}
