export function isSemanticInputOrAction(element: Element): boolean {
  const tagName = element.tagName.toLowerCase();
  if (['input', 'select', 'textarea', 'button'].includes(tagName)) return true;
  const role = element.getAttribute('role');
  return Boolean(
    role &&
      ['button', 'checkbox', 'radio', 'combobox', 'textbox', 'link'].includes(
        role,
      ),
  );
}

export function isProbablyVisible(element: Element): boolean {
  if (
    element.hasAttribute('hidden') ||
    element.getAttribute('aria-hidden') === 'true'
  ) {
    return false;
  }

  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  if (
    Number.parseFloat(style.opacity || '1') === 0 &&
    !isSemanticInputOrAction(element)
  ) return false;

  const rect = element.getBoundingClientRect();
  if (
    rect.width === 0 &&
    rect.height === 0 &&
    !isSemanticInputOrAction(element)
  ) return false;
  return true;
}
