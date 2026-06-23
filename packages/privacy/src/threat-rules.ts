export interface ThreatAnalysis {
  riskLevel: 'low' | 'medium' | 'high';
  warnings: string[];
}

type RiskLevel = ThreatAnalysis['riskLevel'];

function maxRisk(left: RiskLevel, right: RiskLevel): RiskLevel {
  const levels: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };
  return levels[left] >= levels[right] ? left : right;
}

export function analyzePageRisk(
  url: string,
  title: string,
  textSnippet: string,
): ThreatAnalysis {
  const warnings: string[] = [];
  let riskLevel: RiskLevel = 'low';
  const normalizedUrl = url.toLowerCase();
  const normalizedTitle = title.toLowerCase();
  const normalizedText = textSnippet.toLowerCase();

  const isFinancial =
    normalizedUrl.includes('bank') ||
    normalizedUrl.includes('checkout') ||
    normalizedUrl.includes('payment') ||
    normalizedUrl.includes('paypal') ||
    normalizedUrl.includes('stripe') ||
    normalizedUrl.includes('billing') ||
    /credit[- ]?card|transaction|invoice|bank account/i.test(normalizedText);
  if (isFinancial) {
    riskLevel = 'high';
    warnings.push(
      'Financial or payment portal indicators detected. Extracted context may contain billing or transactional logs.',
    );
  }

  const isMedical =
    normalizedUrl.includes('medical') ||
    normalizedUrl.includes('patient') ||
    normalizedUrl.includes('health') ||
    normalizedUrl.includes('clinic') ||
    normalizedUrl.includes('epic') ||
    /prescription|medical record|diagnosis|patient info/i.test(normalizedText);
  if (isMedical) {
    riskLevel = maxRisk(riskLevel, 'medium');
    warnings.push(
      'Medical or patient portal indicators detected. Extracted context may contain HIPAA-sensitive personal details.',
    );
  }

  const isGovernment =
    normalizedUrl.includes('.gov') ||
    normalizedUrl.includes('government') ||
    normalizedUrl.includes('court') ||
    normalizedUrl.includes('tax') ||
    normalizedUrl.includes('passport');
  if (isGovernment) {
    riskLevel = maxRisk(riskLevel, 'medium');
    warnings.push(
      'Government or tax portal indicators detected. Extracted context may contain official registration details.',
    );
  }

  const isAuthentication =
    normalizedUrl.includes('login') ||
    normalizedUrl.includes('signin') ||
    normalizedUrl.includes('oauth') ||
    normalizedUrl.includes('settings/account') ||
    normalizedTitle.includes('sign in') ||
    normalizedTitle.includes('log in');
  if (isAuthentication) {
    riskLevel = maxRisk(riskLevel, 'high');
    warnings.push(
      'Authentication or sign-in page detected. Be careful not to expose credentials or access tokens.',
    );
  }

  const isDashboard =
    normalizedUrl.includes('dashboard') ||
    normalizedUrl.includes('console') ||
    normalizedUrl.includes('admin') ||
    normalizedTitle.includes('dashboard') ||
    /welcome back|my account|settings|analytics|metrics/i.test(normalizedText);
  if (isDashboard && riskLevel === 'low') {
    riskLevel = 'medium';
    warnings.push(
      'Private account dashboard detected. Extracted content may contain internal usage metrics.',
    );
  }

  return { riskLevel, warnings };
}
