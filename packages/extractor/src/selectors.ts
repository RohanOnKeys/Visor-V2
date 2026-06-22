// Migrated from Visor v1 src/content/selectors.ts.
export function getSelectorHint(element: Element): string {
  if (element.id) {
    return `#${CSS.escape(element.id)}`;
  }

  const testId = element.getAttribute('data-testid');
  if (testId) {
    return `[data-testid="${CSS.escape(testId)}"]`;
  }

  const name = element.getAttribute('name');
  if (name) {
    return `${element.tagName.toLowerCase()}[name="${CSS.escape(name)}"]`;
  }

  const role = element.getAttribute('role');
  const ariaLabel = element.getAttribute('aria-label');
  if (role && ariaLabel) {
    return `[role="${CSS.escape(role)}"][aria-label="${CSS.escape(ariaLabel)}"]`;
  }

  return element.tagName.toLowerCase();
}
