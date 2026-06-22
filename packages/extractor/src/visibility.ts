// Migrated from Visor v1 src/content/visibility.ts.
export function isSemanticInputOrAction(element: Element): boolean {
  const tagName = element.tagName.toLowerCase();
  return (
    ['button', 'input', 'select', 'textarea', 'summary'].includes(tagName) ||
    (tagName === 'a' && element.hasAttribute('href')) ||
    element.hasAttribute('role') ||
    element.hasAttribute('contenteditable')
  );
}

export function isProbablyVisible(element: Element): boolean {
  if (!(element instanceof HTMLElement)) return true;
  if (element.hidden || element.getAttribute('aria-hidden') === 'true') return false;

  const style = window.getComputedStyle(element);
  if (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    Number.parseFloat(style.opacity || '1') === 0
  ) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}
