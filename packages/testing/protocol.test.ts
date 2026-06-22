import { describe, expect, it } from 'vitest';
import {
  BRIDGE_PROTOCOL_VERSION,
  type BridgeRequest,
} from '@visor/protocol';
import { BrowserObserveRequestSchema } from '@visor/schemas';

describe('Visor bridge contracts', () => {
  it('creates versioned request envelopes', () => {
    const request: BridgeRequest<'browser.observe', { mode: 'interactive' }> = {
      protocol: BRIDGE_PROTOCOL_VERSION,
      kind: 'request',
      id: 'request-1',
      method: 'browser.observe',
      sentAt: '2026-06-22T00:00:00.000Z',
      payload: { mode: 'interactive' },
    };

    expect(request.protocol).toBe('visor_bridge.v1');
  });

  it('applies safe observation defaults', () => {
    expect(BrowserObserveRequestSchema.parse({})).toEqual({
      mode: 'interactive',
      includeScreenshot: false,
    });
  });
});
