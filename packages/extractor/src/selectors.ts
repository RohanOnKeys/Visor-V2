export function getSelectorHint(element: Element): string {
  const stableSelf = getStableSelector(element);
  if (stableSelf) return stableSelf;

  const path: string[] = [];
  let current: Element | null = element;
  while (current) {
    const stable = getStableSelector(current);
    let selector = stable ?? current.tagName.toLowerCase();
    const id = current.getAttribute('id');
    if (!stable && id && /^[a-zA-Z0-9_-]+$/.test(id)) {
      path.unshift(`#${id}`);
      break;
    }
    const className = current.getAttribute('class');
    if (!stable && className) {
      const firstClass = className
        .trim()
        .split(/\s+/)
        .find((value) => /^[a-zA-Z0-9_-]+$/.test(value));
      if (firstClass) selector += `.${firstClass}`;
    }
    const parent: Element | null = current.parentElement;
    if (parent && !stable) {
      const siblings: Element[] = Array.from(parent.children);
      const tagName = current.tagName;
      if (
        siblings.filter((sibling) => sibling.tagName === tagName).length > 1
      ) {
        selector += `:nth-child(${siblings.indexOf(current) + 1})`;
      }
    }
    path.unshift(selector);
    if (stable) break;
    current = parent;
  }
  return path.join(' > ');
}

function getStableSelector(element: Element): string | undefined {
  const tag = element.tagName.toLowerCase();
  for (const attribute of [
    'data-testid',
    'data-test',
    'data-cy',
    'data-qa',
    'data-track-id',
    'aria-label',
  ]) {
    const value = element.getAttribute(attribute);
    if (value && value.length <= 80) {
      return `${tag}[${attribute}="${escapeAttribute(value)}"]`;
    }
  }
  const role = element.getAttribute('role');
  if (!role) return undefined;
  const name = element.getAttribute('aria-label');
  return name
    ? `${tag}[role="${escapeAttribute(role)}"][aria-label="${escapeAttribute(name)}"]`
    : `${tag}[role="${escapeAttribute(role)}"]`;
}

function escapeAttribute(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
