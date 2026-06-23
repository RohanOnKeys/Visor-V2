import { describe, expect, it } from 'vitest';
import { scoreActionBlock, scoreTextBlock } from '@visor/compiler';
import type { ActionBlock, TextBlock } from '@visor/protocol';

describe('V1 importance scoring parity', () => {
  it('ranks main article content above navigation', () => {
    const main: TextBlock = {
      id: 'main',
      text: 'A long body paragraph explaining useful article content.',
      selectorHint: 'main#content > article.post-body',
      sourceOrder: 1,
    };
    const nav: TextBlock = {
      id: 'nav',
      text: 'Privacy Home Contact Menu',
      selectorHint: 'header.nav-header > ul.menu-items',
      sourceOrder: 2,
    };
    expect(scoreTextBlock(main)).toBeGreaterThan(scoreTextBlock(nav));
    expect(scoreTextBlock(main)).toBeGreaterThan(5);
    expect(scoreTextBlock(nav)).toBeLessThan(5);
  });

  it('heavily demotes cookie and advertising elements', () => {
    expect(
      scoreTextBlock({
        id: 'ad',
        text: 'Click here to win in our cookie ad banner',
        selectorHint: 'div.cookie-consent-banner > p.advertising',
        sourceOrder: 1,
      }),
    ).toBeLessThan(-2);
  });

  it('scores enabled actions above disabled actions', () => {
    const enabled: ActionBlock = {
      id: 'enabled',
      type: 'button',
      label: 'Submit',
      selectorHint: 'form > button.submit',
      textContext: 'Submit',
      sourceOrder: 1,
    };
    expect(scoreActionBlock(enabled)).toBeGreaterThan(
      scoreActionBlock({ ...enabled, id: 'disabled', disabled: true }),
    );
  });
});
