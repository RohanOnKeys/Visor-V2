import type { ObservationGeneration } from '@visor/protocol';
import type { CompileRequest } from '@visor/protocol';
import { extractPageSnapshot } from '@visor/extractor';

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

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (
    typeof message !== 'object' ||
    message === null ||
    !('type' in message) ||
    message.type !== 'VISOR_EXTRACT_DOM'
  ) {
    return false;
  }

  try {
    const payload =
      'payload' in message &&
      typeof message.payload === 'object' &&
      message.payload !== null
        ? message.payload
        : {};
    const request =
      'settings' in payload
        ? (payload.settings as CompileRequest)
        : ({
            mode: 'detailed',
            privacyLevel: 'medium',
            tokenBudget: 4000,
          } satisfies CompileRequest);
    sendResponse({ ok: true, snapshot: extractPageSnapshot(request) });
  } catch (error) {
    sendResponse({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return false;
});
