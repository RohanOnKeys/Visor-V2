// Migrated from the deterministic token estimator in Visor v1.
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}
