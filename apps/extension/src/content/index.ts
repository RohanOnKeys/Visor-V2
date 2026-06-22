import type { ObservationGeneration } from '@visor/protocol';

export function createObservationGeneration(
  tabId: number,
  frameId: number,
): ObservationGeneration {
  return {
    id: crypto.randomUUID(),
    tabId,
    frameId,
    documentId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
}
