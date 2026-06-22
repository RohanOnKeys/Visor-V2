// Migrated from Visor v1 src/compiler/normalizer.ts.
export function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return url;
  }
}

export function cleanLabel(label: string): string {
  return normalizeText(
    label
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\s*[:\-–—]\s*$/g, ''),
  );
}
