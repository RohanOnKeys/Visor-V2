import type { PageClassification, PageSnapshot } from '@visor/protocol';

export function classifyPage(snapshot: PageSnapshot): PageClassification {
  const url = snapshot.source.url.toLowerCase();
  const title = snapshot.source.title.toLowerCase();
  const semanticRoute = snapshot.metadata.semanticRoute;
  const formCount = snapshot.forms.length;
  const tableCount = snapshot.tables.length;
  const actionCount = snapshot.actions.length;
  const textCount = snapshot.textBlocks.length;
  const headingCount = snapshot.headings.length;
  let longTextCount = 0;
  let codeSnippetCount = 0;

  for (const block of snapshot.textBlocks) {
    if (block.text.length > 150) longTextCount++;
    if (
      block.text.includes('{') &&
      block.text.includes('}') &&
      block.text.includes(';')
    ) {
      codeSnippetCount++;
    }
  }

  if (semanticRoute === 'wikipedia_article') {
    return { type: 'article', confidence: 0.93 };
  }
  if (
    url.includes('docs') ||
    url.includes('documentation') ||
    codeSnippetCount > 2 ||
    (headingCount > 5 && codeSnippetCount >= 1)
  ) {
    return { type: 'docs', confidence: 0.85 };
  }
  if (formCount > 0) {
    const totalFields = snapshot.forms.reduce(
      (count, form) => count + form.fields.length,
      0,
    );
    if (totalFields > 3 || (totalFields > 0 && textCount < 5)) {
      return { type: 'form', confidence: 0.9 };
    }
  }
  if (tableCount >= 1) {
    const totalRows = snapshot.tables.reduce(
      (count, table) => count + table.rows.length,
      0,
    );
    if (totalRows > 10 || tableCount > 2) {
      return { type: 'table', confidence: 0.85 };
    }
  }

  const hasProductKeywords =
    url.includes('product') ||
    url.includes('shop') ||
    url.includes('store') ||
    url.includes('item') ||
    title.includes('buy') ||
    title.includes('price');
  const hasPrice = snapshot.textBlocks.some(
    (block) =>
      /\$[0-9]+(\.[0-9]{2})?/.test(block.text) ||
      /price|cost|usd/i.test(block.text),
  );
  if (hasProductKeywords && (hasPrice || tableCount >= 1)) {
    return { type: 'product', confidence: 0.8 };
  }
  if (longTextCount >= 3 && headingCount >= 1 && textCount > headingCount) {
    return { type: 'article', confidence: 0.85 };
  }

  const hasDashboardKeywords =
    url.includes('dashboard') ||
    url.includes('console') ||
    url.includes('admin') ||
    title.includes('dashboard') ||
    title.includes('console');
  if (hasDashboardKeywords || (actionCount > 5 && textCount < 15)) {
    return { type: 'dashboard', confidence: 0.75 };
  }
  if (actionCount > 10 && textCount < 8) {
    return { type: 'app', confidence: 0.8 };
  }
  return { type: 'unknown', confidence: 0.5 };
}
