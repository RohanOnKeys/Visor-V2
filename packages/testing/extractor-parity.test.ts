// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { extractPageSnapshot, getSelectorHint } from '@visor/extractor';
import { PageSnapshotSchema } from '@visor/schemas';
import type { CompileRequest } from '@visor/protocol';

const request: CompileRequest = {
  mode: 'detailed',
  privacyLevel: 'strict',
  tokenBudget: 4000,
};

describe('V1 DOM extractor parity', () => {
  beforeEach(() => {
    document.head.innerHTML =
      '<title>Fixture Page</title><link rel="canonical" href="https://example.com/canonical">';
    document.body.innerHTML = '';
    Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        width: 100,
        height: 20,
        top: 0,
        right: 100,
        bottom: 20,
        left: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });
  });

  it('extracts headings, text, links, actions, tables, and media', () => {
    document.body.innerHTML = `
      <main id="content">
        <h1>Visor Fixture</h1>
        <p>Useful visible article content for an agent.</p>
        <a href="/docs">Read docs</a>
        <button data-testid="save">Save changes</button>
        <table><caption>Usage</caption><tr><th>Day</th><th>Count</th></tr><tr><td>Monday</td><td>3</td></tr></table>
        <img src="/hero.png" alt="Visor hero">
      </main>
    `;

    const result = extractPageSnapshot(request);
    expect(PageSnapshotSchema.safeParse(result).success).toBe(true);
    expect(result.headings[0]?.text).toBe('Visor Fixture');
    expect(result.textBlocks.some((block) => block.text.includes('Useful visible'))).toBe(true);
    expect(result.links[0]?.text).toBe('Read docs');
    expect(result.actions[0]?.label).toBe('Save changes');
    expect(result.tables[0]?.caption).toBe('Usage');
    expect(result.media[0]?.alt).toBe('Visor hero');
  });

  it('never extracts password or one-time-code values', () => {
    document.body.innerHTML = `
      <form id="login">
        <label for="email">Email address</label>
        <input id="email" name="email" value="rohan@example.com">
        <label for="password">Password</label>
        <input id="password" type="password" value="do-not-read">
        <input id="otp" autocomplete="one-time-code" value="123456">
        <button type="submit">Sign in</button>
      </form>
    `;

    const form = extractPageSnapshot(request).forms[0];
    expect(form?.fields.find((field) => field.id === 'email')?.value).toBe(
      'rohan@example.com',
    );
    expect(form?.fields.find((field) => field.id === 'password')?.value).toBeUndefined();
    expect(form?.fields.find((field) => field.id === 'otp')?.value).toBeUndefined();
    expect(form?.submitControls[0]?.label).toBe('Sign in');
  });

  it('honors site-profile root, ignore, and preserve selectors', () => {
    document.body.innerHTML = `
      <aside><p>Outside root</p></aside>
      <main id="article">
        <p class="ignore">Ignored copy</p>
        <p class="preserve" hidden>Preserved hidden copy</p>
        <p>Included copy</p>
      </main>
    `;
    const result = extractPageSnapshot({
      ...request,
      siteProfile: {
        id: 'profile',
        domain: 'example.com',
        mainContentSelector: '#article',
        ignoreSelectors: ['.ignore'],
        preserveSelectors: ['.preserve'],
        createdAt: '2026-06-23T00:00:00.000Z',
        updatedAt: '2026-06-23T00:00:00.000Z',
      },
    });
    const text = result.textBlocks.map((block) => block.text).join(' ');
    expect(text).toContain('Included copy');
    expect(text).toContain('Preserved hidden copy');
    expect(text).not.toContain('Ignored copy');
    expect(text).not.toContain('Outside root');
  });

  it('traverses open shadow roots and reports them', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<p>Shadow-root content</p>';
    document.body.append(host);

    const result = extractPageSnapshot(request);
    expect(result.textBlocks.some((block) => block.text === 'Shadow-root content')).toBe(true);
    expect(result.warnings.some((warning) => warning.type === 'shadow_dom')).toBe(true);
  });

  it('generates stable diagnostic selector hints', () => {
    document.body.innerHTML = `
      <section id="root">
        <button data-testid="primary-action">Continue</button>
        <div class="row"><span>First</span><span class="value">Second</span></div>
      </section>
    `;
    expect(
      getSelectorHint(document.querySelector('[data-testid]') as Element),
    ).toBe('button[data-testid="primary-action"]');
    expect(getSelectorHint(document.querySelector('.value') as Element)).toContain(
      '#root',
    );
  });
});
