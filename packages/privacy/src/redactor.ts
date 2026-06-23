import type {
  ContentBlock,
  PrivacyLevel,
  PrivacyReport,
  RedactedItem,
} from '@visor/protocol';
import { analyzePageRisk } from './threat-rules.js';

const PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone:
    /(?:\b\+?[1-9]\d{0,2}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  jwt: /\beyJ[a-zA-Z0-9-_=]+\.[a-zA-Z0-9-_=]+\.[a-zA-Z0-9-_=]+\b/g,
  apiKey:
    /\b(sk-[a-zA-Z0-9]{48}|sk-proj-[a-zA-Z0-9_-]{32,}|AIzaSy[a-zA-Z0-9_-]{33})\b/g,
};

export function redactPlainText(
  text: string | undefined,
  privacyLevel: PrivacyLevel,
): string | undefined {
  return redactPlainTextWithReport(text, privacyLevel, 'unknown').text;
}

export function redactPlainTextWithReport(
  text: string | undefined,
  privacyLevel: PrivacyLevel,
  location: string,
): { text: string | undefined; redactedItems: RedactedItem[] } {
  if (text === undefined) {
    return { text: undefined, redactedItems: [] };
  }

  const counts = new Map<RedactedItem['type'], number>();
  const replacePattern = (
    value: string,
    pattern: RegExp,
    replacement: string,
    type: RedactedItem['type'],
  ): string => {
    const matches = value.match(pattern);
    if (!matches) return value;
    counts.set(type, (counts.get(type) ?? 0) + matches.length);
    return value.replace(pattern, replacement);
  };

  let redacted = replacePattern(text, PATTERNS.jwt, '[REDACTED_JWT]', 'jwt');
  redacted = replacePattern(
    redacted,
    PATTERNS.apiKey,
    '[REDACTED_API_KEY]',
    'api_key',
  );

  if (privacyLevel === 'medium' || privacyLevel === 'strict') {
    redacted = replacePattern(
      redacted,
      PATTERNS.email,
      '[REDACTED_EMAIL]',
      'email',
    );
  }
  if (privacyLevel === 'strict') {
    redacted = replacePattern(
      redacted,
      PATTERNS.phone,
      '[REDACTED_PHONE]',
      'phone',
    );
  }

  return {
    text: redacted,
    redactedItems: Array.from(counts, ([type, count]) => ({
      type,
      count,
      locations: [location],
    })),
  };
}

export function applyRedaction(
  blocks: ContentBlock[],
  privacyLevel: PrivacyLevel,
  source?: { url?: string; title?: string },
): { redactedBlocks: ContentBlock[]; privacyReport: PrivacyReport } {
  const totals = new Map<
    RedactedItem['type'],
    { count: number; locations: Set<string> }
  >();
  const redactedBlocks = blocks.map((block) => {
    const result = redactPlainTextWithReport(
      block.text,
      privacyLevel,
      block.id,
    );
    for (const item of result.redactedItems) {
      const total = totals.get(item.type) ?? {
        count: 0,
        locations: new Set<string>(),
      };
      total.count += item.count;
      total.locations.add(block.id);
      totals.set(item.type, total);
    }
    return { ...block, text: result.text ?? '' };
  });

  const redactedItems = Array.from(totals, ([type, value]) => ({
    type,
    count: value.count,
    locations: Array.from(value.locations),
  }));
  const pageSnippet = blocks
    .filter((block) => block.kind !== 'heading')
    .slice(0, 10)
    .map((block) => block.text)
    .join(' ')
    .slice(0, 2000);
  const title =
    source?.title ??
    blocks.find((block) => block.kind === 'heading')?.text ??
    'Active Page';
  const threat = analyzePageRisk(source?.url ?? '', title, pageSnippet);
  let riskLevel = threat.riskLevel;

  if (redactedItems.length > 0) {
    riskLevel = 'high';
    threat.warnings.push(
      `Extracted text contained sensitive credentials or personal records which were redacted (level: ${privacyLevel}).`,
    );
  }

  return {
    redactedBlocks,
    privacyReport: {
      riskLevel,
      redactionLevel: privacyLevel,
      redactedItems,
      warnings: threat.warnings,
      externalSharingAllowed: riskLevel !== 'high',
    },
  };
}
