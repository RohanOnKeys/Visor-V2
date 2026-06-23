// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import {
  isProbablyVisible,
  isSemanticInputOrAction,
} from '@visor/extractor';

describe('V1 visibility parity', () => {
  beforeEach(() => {
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

  it('recognizes semantic controls and supported roles', () => {
    expect(isSemanticInputOrAction(document.createElement('input'))).toBe(true);
    const buttonRole = document.createElement('div');
    buttonRole.setAttribute('role', 'button');
    expect(isSemanticInputOrAction(buttonRole)).toBe(true);
    expect(isSemanticInputOrAction(document.createElement('div'))).toBe(false);
  });

  it('rejects hidden, aria-hidden, and display-none elements', () => {
    const hidden = document.createElement('div');
    hidden.hidden = true;
    expect(isProbablyVisible(hidden)).toBe(false);

    const ariaHidden = document.createElement('div');
    ariaHidden.setAttribute('aria-hidden', 'true');
    expect(isProbablyVisible(ariaHidden)).toBe(false);

    const displayNone = document.createElement('div');
    displayNone.style.display = 'none';
    expect(isProbablyVisible(displayNone)).toBe(false);
  });

  it('retains zero-size semantic controls but not ordinary elements', () => {
    const zeroRect = () => ({
      width: 0,
      height: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    const input = document.createElement('input');
    input.getBoundingClientRect = zeroRect;
    const div = document.createElement('div');
    div.getBoundingClientRect = zeroRect;

    expect(isProbablyVisible(input)).toBe(true);
    expect(isProbablyVisible(div)).toBe(false);
  });
});
