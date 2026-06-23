import type {
  ActionBlock,
  HeadingBlock,
  TextBlock,
} from '@visor/protocol';
import { isNoiseElement } from './noise-filter.js';

export function scoreTextBlock(
  block: TextBlock,
  parentHeadingLevel?: number,
): number {
  let score = 5;
  const selector = block.selectorHint.toLowerCase();

  if (
    selector.includes('article') ||
    selector.includes('main') ||
    selector.includes('[role="main"]')
  ) {
    score += 8;
  }
  if (
    selector.includes('content') ||
    selector.includes('body') ||
    selector.includes('post-text')
  ) {
    score += 4;
  }
  if (parentHeadingLevel) {
    score += parentHeadingLevel <= 3 ? 3 : 1;
  }
  if (
    selector.includes('nav') ||
    selector.includes('header') ||
    selector.includes('footer') ||
    selector.includes('menu') ||
    selector.includes('sidebar') ||
    selector.includes('aside')
  ) {
    score -= 6;
  }
  if (isNoiseElement(selector)) score -= 10;
  if (block.text.length < 15) score -= 3;
  else if (block.text.length > 200) score += 2;
  return score;
}

export function scoreActionBlock(block: ActionBlock): number {
  let score = 7;
  const selector = block.selectorHint.toLowerCase();
  if (block.disabled) score -= 3;
  if (block.required) score += 2;
  if (
    selector.includes('nav') ||
    selector.includes('footer') ||
    selector.includes('header') ||
    selector.includes('menu')
  ) {
    score -= 4;
  }
  return score;
}

export function scoreHeadingBlock(block: HeadingBlock): number {
  return Math.max(5, 11 - block.level);
}
