import type { ContentBlock, TokenProfile } from '@visor/protocol';

const TOKEN_TOLERANCE = 100;

export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export function applyTokenBudget(
  blocks: ContentBlock[],
  budget: number,
  tolerance = TOKEN_TOLERANCE,
): {
  budgetedBlocks: ContentBlock[];
  profile: TokenProfile;
  compilerNotes: string[];
} {
  const rawEstimatedTokens = blocks.reduce(
    (total, block) => total + block.tokenEstimate,
    0,
  );
  if (rawEstimatedTokens <= budget) {
    return {
      budgetedBlocks: blocks,
      profile: {
        rawEstimatedTokens,
        compiledEstimatedTokens: rawEstimatedTokens,
        removedNoiseTokens: 0,
        compressionRatio: 1,
        budget,
        budgetStatus: 'under_budget',
      },
      compilerNotes: [],
    };
  }

  const notes = [
    `Total content tokens (${rawEstimatedTokens}) exceeded token budget (${budget}). Trimming and clipping lower priority content toward a +/-${tolerance} token target.`,
  ];
  const sortedBlocks = [...blocks].sort(
    (left, right) =>
      right.importanceScore - left.importanceScore ||
      left.sourceOrder - right.sourceOrder,
  );
  const budgetedBlocks: ContentBlock[] = [];
  const skippedBlocks: ContentBlock[] = [];
  let currentTokens = 0;

  for (const block of sortedBlocks) {
    if (currentTokens + block.tokenEstimate <= budget) {
      budgetedBlocks.push(block);
      currentTokens += block.tokenEstimate;
    } else {
      skippedBlocks.push(block);
    }
  }
  if (budget - currentTokens > tolerance) {
    const filler = skippedBlocks.find((block) => block.text.length > 0);
    if (filler) {
      const clipped = clipBlockToTokenBudget(filler, budget - currentTokens);
      if (clipped.tokenEstimate > 0) {
        budgetedBlocks.push(clipped);
        currentTokens += clipped.tokenEstimate;
        notes.push(
          `Added a clipped block (${clipped.id}) to land closer to the requested budget.`,
        );
      }
    }
  }
  budgetedBlocks.sort(
    (left, right) => left.sourceOrder - right.sourceOrder,
  );
  return {
    budgetedBlocks,
    profile: {
      rawEstimatedTokens,
      compiledEstimatedTokens: currentTokens,
      removedNoiseTokens: rawEstimatedTokens - currentTokens,
      compressionRatio:
        rawEstimatedTokens > 0
          ? Number((currentTokens / rawEstimatedTokens).toFixed(2))
          : 0,
      budget,
      budgetStatus:
        currentTokens > budget * 0.9
          ? 'over_budget_trimmed'
          : 'near_budget',
    },
    compilerNotes: notes,
  };
}

function clipBlockToTokenBudget(
  block: ContentBlock,
  maxTokens: number,
): ContentBlock {
  const clippedText = block.text
    .slice(0, Math.max(0, maxTokens * 4))
    .replace(/\s+\S*$/, '')
    .trim();
  const suffix = block.text.length > clippedText.length ? ' ...' : '';
  const text = clippedText ? `${clippedText}${suffix}` : '';
  return {
    ...block,
    id: `${block.id}-budget-fill`,
    text,
    tokenEstimate: estimateTokenCount(text),
  };
}
