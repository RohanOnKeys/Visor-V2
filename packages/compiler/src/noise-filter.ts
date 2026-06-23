import type { TextBlock } from '@visor/protocol';

const NOISE_SELECTORS = [
  'cookie',
  'consent',
  'banner',
  'newsletter',
  'subscribe',
  'promo',
  'advertising',
  'ad-container',
  'social-share',
  'sidebar-ads',
  'related-posts',
  'footer-nav',
  'modal-overlay',
];

export function isNoiseElement(selector: string): boolean {
  const normalized = selector.toLowerCase();
  return NOISE_SELECTORS.some((pattern) => normalized.includes(pattern));
}

export function deduplicateTextBlocks(blocks: TextBlock[]): {
  keptBlocks: TextBlock[];
  duplicateBlockIds: Set<string>;
  removedTokens: number;
} {
  const seenTexts = new Set<string>();
  const duplicateBlockIds = new Set<string>();
  const keptBlocks: TextBlock[] = [];
  let removedTokens = 0;

  for (const block of blocks) {
    const textHash = block.text.trim().toLowerCase().replace(/\s+/g, '');
    if (!textHash) {
      duplicateBlockIds.add(block.id);
      continue;
    }
    if (seenTexts.has(textHash)) {
      duplicateBlockIds.add(block.id);
      removedTokens += Math.ceil(block.text.length / 4);
    } else {
      seenTexts.add(textHash);
      keptBlocks.push(block);
    }
  }
  return { keptBlocks, duplicateBlockIds, removedTokens };
}
