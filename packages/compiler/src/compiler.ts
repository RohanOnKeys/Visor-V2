import type {
  ActionElement,
  AgentContext,
  CompileRequest,
  CompilerNote,
  ContentBlock,
  DataElement,
  HeadingBlock,
  HeadingNode,
  LayoutGroupElement,
  PageSnapshot,
  PrivacyReport,
  RedactedItem,
} from '@visor/protocol';
import { applyRedaction, redactPlainTextWithReport } from '@visor/privacy';
import { AgentContextSchema } from '@visor/schemas';
import { classifyPage } from './classifier.js';
import { formatAsMarkdown, formatAsPromptBlock } from './exporter.js';
import { deduplicateTextBlocks, isNoiseElement } from './noise-filter.js';
import { cleanLabel, normalizeText, normalizeUrl } from './normalizer.js';
import { scoreHeadingBlock, scoreTextBlock } from './scorer.js';
import { applyTokenBudget, estimateTokenCount } from './token-budget.js';

export function buildHeadingHierarchy(headings: HeadingBlock[]): HeadingNode[] {
  const roots: HeadingNode[] = [];
  const stack: { level: number; node: HeadingNode }[] = [];
  for (const heading of headings) {
    const node: HeadingNode = {
      id: heading.id,
      text: heading.text,
      level: heading.level,
      children: [],
    };
    while (
      stack.length > 0 &&
      (stack.at(-1)?.level ?? Number.POSITIVE_INFINITY) >= heading.level
    ) {
      stack.pop();
    }
    const parent = stack.at(-1);
    if (parent) parent.node.children.push(node);
    else roots.push(node);
    stack.push({ level: heading.level, node });
  }
  return roots;
}

export function compileSnapshot(
  snapshot: PageSnapshot,
  request: CompileRequest,
): {
  context: AgentContext;
  exports: { json: string; markdown: string; promptBlock: string };
} {
  const compilerNotes: CompilerNote[] = [];
  const structuredRedactions: RedactedItem[] = [];
  const normalizedUrl = normalizeUrl(snapshot.source.url);
  const normalizedTitle = normalizeText(snapshot.source.title);
  const headingMap = new Map(snapshot.headings.map((heading) => [heading.id, heading]));

  const redact = (
    text: string | undefined,
    location: string,
  ): string | undefined => {
    const result = redactPlainTextWithReport(
      text,
      request.privacyLevel,
      location,
    );
    structuredRedactions.push(...result.redactedItems);
    return result.text;
  };
  const headingPath = (parentHeadingId?: string): string[] => {
    const path: string[] = [];
    let currentId = parentHeadingId;
    while (currentId) {
      const heading = headingMap.get(currentId);
      if (!heading) break;
      path.unshift(heading.text);
      const index = snapshot.headings.findIndex((item) => item.id === currentId);
      const parent = snapshot.headings
        .slice(0, Math.max(0, index))
        .reverse()
        .find((item) => item.level < heading.level);
      currentId = parent?.id;
    }
    return path;
  };

  compilerNotes.push({
    level: 'info',
    category: 'filtering',
    message: `Starting compile in mode: ${request.mode}. Initial blocks: headings=${snapshot.headings.length}, text=${snapshot.textBlocks.length}.`,
  });
  const candidates: ContentBlock[] = snapshot.headings.map((heading) => {
    const text = normalizeText(heading.text);
    return {
      id: heading.id,
      kind: 'heading',
      text,
      headingPath: headingPath(heading.id),
      selectorHint: heading.selectorHint,
      importanceScore: scoreHeadingBlock(heading),
      tokenEstimate: estimateTokenCount(text),
      sourceOrder: heading.sourceOrder,
    };
  });

  const deduplicated = deduplicateTextBlocks(snapshot.textBlocks);
  if (deduplicated.removedTokens > 0) {
    compilerNotes.push({
      level: 'info',
      category: 'deduplication',
      message: `Hashed duplicate detector removed ${deduplicated.duplicateBlockIds.size} repeated text blocks, pruning ${deduplicated.removedTokens} estimated tokens.`,
    });
  }
  if (request.mode === 'debug' && deduplicated.duplicateBlockIds.size > 0) {
    compilerNotes.push({
      level: 'info',
      category: 'deduplication',
      message: `Debug mode retained duplicate blocks that normal modes remove: ${Array.from(deduplicated.duplicateBlockIds).slice(0, 20).join(', ')}.`,
    });
  }

  const sourceTextBlocks =
    request.mode === 'debug' ? snapshot.textBlocks : deduplicated.keptBlocks;
  const filteredNoiseIds: string[] = [];
  for (const block of sourceTextBlocks) {
    const noise = isNoiseElement(block.selectorHint);
    if (noise && request.mode !== 'debug') {
      if (filteredNoiseIds.length < 20) filteredNoiseIds.push(block.id);
      continue;
    }
    const text = normalizeText(block.text);
    candidates.push({
      id: block.id,
      kind: /pre|code/i.test(block.selectorHint) ? 'code' : 'paragraph',
      text,
      headingPath: headingPath(block.parentHeadingId),
      selectorHint: block.selectorHint,
      importanceScore: noise
        ? -5
        : scoreTextBlock(
            block,
            block.parentHeadingId
              ? headingMap.get(block.parentHeadingId)?.level
              : undefined,
          ),
      tokenEstimate: estimateTokenCount(text),
      sourceOrder: block.sourceOrder,
    });
  }
  if (filteredNoiseIds.length > 0) {
    compilerNotes.push({
      level: 'info',
      category: 'filtering',
      message: `Noise filter removed ${filteredNoiseIds.length} text blocks before scoring: ${filteredNoiseIds.join(', ')}.`,
    });
  }

  const actionableElements: ActionElement[] = snapshot.actions.map((action) => {
    const label = redact(cleanLabel(action.label), `${action.id}.label`) ?? '';
    const lowerLabel = label.toLowerCase();
    let actionPurpose = 'interaction';
    if (/submit|login|sign/.test(lowerLabel)) actionPurpose = 'submit';
    else if (lowerLabel.includes('search')) actionPurpose = 'search';
    else if (/close|cancel|dismiss/.test(lowerLabel)) {
      actionPurpose = 'navigation_close';
    } else if (/next|continue/.test(lowerLabel)) {
      actionPurpose = 'navigation_next';
    }
    return {
      id: action.id,
      type: action.type,
      label,
      selectorHint: action.selectorHint,
      textContext:
        redact(action.textContext, `${action.id}.textContext`) ?? '',
      actionPurpose,
      confidence: 0.9,
      disabled: action.disabled,
      required: action.required,
      privacySensitive:
        action.type === 'input' &&
        action.selectorHint.toLowerCase().includes('password'),
    };
  });
  const layoutGroups: LayoutGroupElement[] = snapshot.layoutGroups.map(
    (group) => {
      const text = redact(
        normalizeText(group.text),
        `${group.id}.text`,
      ) ?? '';
      return {
        id: group.id,
        label:
          redact(cleanLabel(group.label), `${group.id}.label`) ??
          inferGroupLabel(text, group.role),
        role: group.role,
        text,
        selectorHint: group.selectorHint,
        childActionIds: group.childActionIds,
        childMediaIds: group.childMediaIds,
        importanceScore: scoreLayoutGroup(group.role, text),
      };
    },
  );
  const dataElements = extractDataElements(snapshot, layoutGroups).map(
    (element) => ({
      ...element,
      label: redact(element.label, `${element.id}.label`) ?? element.label,
      value: redact(element.value, `${element.id}.value`) ?? element.value,
    }),
  );

  let filteredBlocks = candidates;
  if (request.mode === 'compact') {
    filteredBlocks = candidates.filter(
      (block) => block.kind === 'heading' || block.importanceScore >= 7,
    );
  } else if (request.mode === 'detailed') {
    filteredBlocks = candidates.filter(
      (block) =>
        block.importanceScore >= 2 ||
        block.kind === 'heading' ||
        block.kind === 'code',
    );
  } else if (request.mode === 'agent_action') {
    const terms =
      /error|warning|required|invalid|success|saved|failed|complete|continue|next|submit|login|sign in|checkout|cart|search/i;
    filteredBlocks = candidates.filter(
      (block) =>
        block.kind === 'heading' ||
        block.kind === 'code' ||
        block.importanceScore >= 6 ||
        terms.test(block.text),
    );
  } else if (request.mode === 'rag') {
    filteredBlocks = createRagChunks(
      candidates.filter(
        (block) => block.kind !== 'heading' && block.importanceScore >= 3,
      ),
    );
  }
  compilerNotes.push({
    level: 'info',
    category: 'filtering',
    message: modeNote(request.mode, filteredBlocks.length),
  });

  const redaction = applyRedaction(
    filteredBlocks,
    request.privacyLevel,
    { url: normalizedUrl, title: normalizedTitle },
  );
  const budget = applyTokenBudget(
    redaction.redactedBlocks,
    request.tokenBudget,
    100,
  );
  compilerNotes.push(
    ...budget.compilerNotes.map(
      (message): CompilerNote => ({
        level: 'warning',
        category: 'budgeting',
        message,
      }),
    ),
  );
  const pageClassification = classifyPage(snapshot);
  compilerNotes.push({
    level: 'info',
    category: 'classification',
    message: `Page classified as: ${pageClassification.type} with confidence ${(pageClassification.confidence * 100).toFixed(0)}%`,
  });

  const links = snapshot.links.map((link) => ({
    id: link.id,
    text: redact(link.text, `${link.id}.text`) ?? '',
    href: redact(link.href, `${link.id}.href`) ?? '',
    headingPath: [] as string[],
    selectorHint: link.selectorHint,
  }));
  const forms = snapshot.forms.map((form) => ({
    id: form.id,
    selectorHint: form.selectorHint,
    label: redact(form.label, `${form.id}.label`),
    purpose: redact(form.purpose, `${form.id}.purpose`),
    fields: form.fields.map((field) => ({
      ...field,
      name: redact(field.name, `${field.id}.name`),
      label: redact(field.label, `${field.id}.label`),
      placeholder: redact(field.placeholder, `${field.id}.placeholder`),
      value:
        field.type === 'password' || field.type === 'one-time-code'
          ? undefined
          : redact(field.value, `${field.id}.value`),
    })),
    submitControls: form.submitControls.map(
      (control) =>
        actionableElements.find((action) => action.id === control.id) ?? {
          id: control.id,
          type: control.type,
          label: redact(control.label, `${control.id}.label`) ?? '',
          selectorHint: control.selectorHint,
          textContext:
            redact(control.textContext, `${control.id}.textContext`) ?? '',
          actionPurpose: 'submit',
          confidence: 0.9,
          disabled: control.disabled,
          required: control.required,
          privacySensitive: false,
        },
    ),
  }));
  const tables = snapshot.tables.map((table) => ({
    id: table.id,
    caption: redact(table.caption, `${table.id}.caption`),
    headingPath: [] as string[],
    headers: table.headers.map(
      (header, index) =>
        redact(header, `${table.id}.headers.${index}`) ?? '',
    ),
    rows: table.rows.map((row, rowIndex) =>
      row.map(
        (cell, cellIndex) =>
          redact(cell, `${table.id}.rows.${rowIndex}.${cellIndex}`) ?? '',
      ),
    ),
    selectorHint: table.selectorHint,
  }));
  const media = snapshot.media.map((item) => ({
    ...item,
    alt: redact(item.alt, `${item.id}.alt`),
    caption: redact(item.caption, `${item.id}.caption`),
    src: redact(item.src, `${item.id}.src`),
  }));
  const structured = shapeStructuredContext(request.mode, {
    actionableElements,
    layoutGroups,
    dataElements,
    links,
    forms,
    tables,
    media,
  });
  if (structured.note) {
    compilerNotes.push({
      level: 'info',
      category: 'filtering',
      message: structured.note,
    });
  }

  const context: AgentContext = {
    schemaVersion: getModeSchemaVersion(request.mode),
    compileMode: request.mode,
    modeProfile: createModeProfile(request),
    source: {
      url: normalizedUrl,
      canonicalUrl: snapshot.source.canonicalUrl,
      title: normalizedTitle,
      capturedAt: snapshot.source.capturedAt,
      language: snapshot.source.language,
      contentHash: createContentHash(snapshot),
    },
    pageClassification,
    summary: {
      short: `${snapshot.source.title} Page. Extracted visible content.`,
      method: 'heuristic',
    },
    hierarchy: buildHeadingHierarchy(snapshot.headings),
    mainContent: budget.budgetedBlocks,
    actionableElements: structured.actionableElements,
    layoutGroups: structured.layoutGroups,
    dataElements: structured.dataElements,
    links: structured.links,
    forms: structured.forms,
    tables: structured.tables,
    media: structured.media,
    tokenProfile: budget.profile,
    privacyReport: mergePrivacyReports(
      redaction.privacyReport,
      structuredRedactions,
      request.privacyLevel,
    ),
    compilerNotes,
  };
  const validation = AgentContextSchema.safeParse(context);
  if (!validation.success) {
    throw new Error(
      `Generated AgentContext failed schema validation: ${validation.error.message}`,
    );
  }
  return {
    context,
    exports: {
      json: JSON.stringify(context, null, 2),
      markdown: formatAsMarkdown(context),
      promptBlock: formatAsPromptBlock(context),
    },
  };
}

function getModeSchemaVersion(
  mode: CompileRequest['mode'],
): AgentContext['schemaVersion'] {
  return `agent_context.${mode}.v1`;
}

function createModeProfile(
  request: CompileRequest,
): AgentContext['modeProfile'] {
  const objectives: Record<CompileRequest['mode'], string> = {
    compact: 'Small high-signal page brief for fast agent grounding.',
    detailed: 'Full semantic page reading with selector traceability.',
    agent_action: 'Operational context for controls, forms, and next actions.',
    rag: 'Retrieval-ready chunks with stable IDs and heading paths.',
    debug: 'Compiler inspection including noisy and duplicate content.',
  };
  return {
    mode: request.mode,
    schemaVersion: getModeSchemaVersion(request.mode),
    objective: objectives[request.mode],
    includedSections: ['source', 'classification', 'content', request.mode],
    omittedSections:
      request.mode === 'debug' ? ['nothing intentionally'] : ['mode-specific noise'],
    tokenTarget: request.tokenBudget,
    tokenTolerance: 100,
  };
}

function modeNote(mode: CompileRequest['mode'], count: number): string {
  if (mode === 'rag') {
    return `RAG mode emitted ${count} stable chunks with heading paths, selector hints, and block-derived IDs.`;
  }
  if (mode === 'debug') {
    return 'Debug mode retained low-score/noise candidates and still applies the requested token budget.';
  }
  if (mode === 'agent_action') {
    return `Agent Mode kept ${count} blocks focused on forms, actions, status text, selector traceability, and nearby operational context.`;
  }
  return `${mode === 'compact' ? 'Compact' : 'Detailed'} mode kept ${count} content blocks.`;
}

function inferGroupLabel(
  text: string,
  role: LayoutGroupElement['role'],
): string {
  return text.split(/(?<=[.!?])\s+/)[0]?.slice(0, 80).trim() || `${role} group`;
}

function scoreLayoutGroup(
  role: LayoutGroupElement['role'],
  text: string,
): number {
  const scores: Partial<Record<LayoutGroupElement['role'], number>> = {
    lead: 10,
    infobox: 9,
    article_section: 8,
    references: 6,
    toc: 5,
    media: 5,
    card: 7,
    section: 5,
  };
  let score = scores[role] ?? 3;
  if (/\b(plan|tier|price|premium|benefit|feature|monthly|yearly)\b/i.test(text)) {
    score += 2;
  }
  if (/\$\s?\d|\d+[.,]\d{2}/.test(text)) score += 2;
  return Math.min(score, 10);
}

function extractDataElements(
  snapshot: PageSnapshot,
  groups: LayoutGroupElement[],
): DataElement[] {
  const elements: DataElement[] = [];
  const seen = new Set<string>();
  const pattern =
    /(?:[$]\s?\d+(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?\s?(?:USD|EUR|GBP|INR|\/\s?(?:mo|month|yr|year)))/gi;
  const add = (
    label: string,
    value: string,
    selectorHint: string | undefined,
    confidence: number,
  ) => {
    const key = `${label.toLowerCase()}::${value.toLowerCase()}::${selectorHint ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    elements.push({
      id: `data-${elements.length + 1}`,
      label,
      value,
      selectorHint,
      confidence,
    });
  };
  for (const group of groups) {
    for (const value of group.text.match(pattern) ?? []) {
      add(`${group.label} price`, value, group.selectorHint, 0.82);
    }
  }
  for (const block of snapshot.textBlocks) {
    for (const value of block.text.match(pattern) ?? []) {
      add('price', value, block.selectorHint, 0.72);
    }
  }
  for (const table of snapshot.tables.filter((item) =>
    /infobox/i.test(`${item.caption ?? ''} ${item.selectorHint}`),
  )) {
    for (const row of table.rows) {
      const label = row[0];
      const value = row.slice(1).join(' | ');
      if (label && value && value.length <= 500) {
        add(`infobox.${label}`, value, table.selectorHint, 0.86);
      }
    }
  }
  return elements;
}

function createRagChunks(blocks: ContentBlock[]): ContentBlock[] {
  const chunks: ContentBlock[] = [];
  for (const block of blocks) {
    if (block.text.length <= 900) {
      chunks.push({
        ...block,
        id: `${block.id}-chunk-1`,
        tokenEstimate: estimateTokenCount(block.text),
      });
      continue;
    }
    let start = 0;
    let index = 1;
    while (start < block.text.length) {
      const end = Math.min(block.text.length, start + 900);
      const text = block.text.slice(start, end).trim();
      if (text) {
        chunks.push({
          ...block,
          id: `${block.id}-chunk-${index}`,
          text,
          tokenEstimate: estimateTokenCount(text),
          sourceOrder: block.sourceOrder * 1000 + index,
        });
      }
      if (end >= block.text.length) break;
      start = Math.max(0, end - 120);
      index++;
    }
  }
  return chunks.sort((left, right) => left.sourceOrder - right.sourceOrder);
}

type StructuredSlices = Pick<
  AgentContext,
  | 'actionableElements'
  | 'layoutGroups'
  | 'dataElements'
  | 'links'
  | 'forms'
  | 'tables'
  | 'media'
>;

function shapeStructuredContext(
  mode: CompileRequest['mode'],
  slices: StructuredSlices,
): StructuredSlices & { note?: string } {
  if (mode === 'debug' || mode === 'detailed') {
    return {
      ...slices,
      note:
        mode === 'debug'
          ? 'Debug mode preserved all structured context arrays for inspection.'
          : 'Detailed mode preserved full structured context arrays.',
    };
  }
  if (mode === 'rag') {
    return {
      actionableElements: [],
      forms: [],
      links: slices.links.slice(0, 40),
      layoutGroups: slices.layoutGroups
        .filter((group) =>
          ['lead', 'article_section', 'infobox', 'references', 'toc'].includes(
            group.role,
          ),
        )
        .slice(0, 20),
      dataElements: slices.dataElements.slice(0, 40),
      tables: slices.tables.slice(0, 10),
      media: slices.media
        .filter((item) => item.alt || item.caption)
        .slice(0, 12),
      note: 'RAG mode removed interactive controls and kept chunk-adjacent structured data, tables, media labels, and reference links.',
    };
  }
  if (mode === 'agent_action') {
    return {
      actionableElements: slices.actionableElements,
      forms: slices.forms,
      links: slices.links.slice(0, 60),
      layoutGroups: slices.layoutGroups
        .filter(
          (group) =>
            group.childActionIds.length > 0 ||
            group.importanceScore >= 7 ||
            /\b(error|required|submit|checkout|login|sign|search|save|continue|next)\b/i.test(
              group.text,
            ),
        )
        .slice(0, 24),
      dataElements: slices.dataElements.slice(0, 30),
      tables: slices.tables.slice(0, 6),
      media: slices.media.slice(0, 8),
      note: 'Agent Mode prioritized controls, forms, operational layout groups, and nearby structured data.',
    };
  }
  return {
    actionableElements: slices.actionableElements.slice(0, 12),
    forms: slices.forms.slice(0, 4),
    links: slices.links.slice(0, 25),
    layoutGroups: slices.layoutGroups
      .filter((group) => group.importanceScore >= 6)
      .slice(0, 10),
    dataElements: slices.dataElements.slice(0, 20),
    tables: slices.tables.slice(0, 4),
    media: slices.media
      .filter((item) => item.alt || item.caption)
      .slice(0, 8),
    note: 'Compact mode trimmed structured context arrays to the highest-signal items.',
  };
}

function mergePrivacyReports(
  base: PrivacyReport,
  structured: RedactedItem[],
  privacyLevel: CompileRequest['privacyLevel'],
): PrivacyReport {
  if (structured.length === 0) return base;
  const items = new Map<
    RedactedItem['type'],
    { count: number; locations: Set<string> }
  >();
  for (const item of [...base.redactedItems, ...structured]) {
    const merged = items.get(item.type) ?? {
      count: 0,
      locations: new Set<string>(),
    };
    merged.count += item.count;
    item.locations.forEach((location) => merged.locations.add(location));
    items.set(item.type, merged);
  }
  return {
    ...base,
    riskLevel: 'high',
    redactedItems: Array.from(items, ([type, value]) => ({
      type,
      count: value.count,
      locations: Array.from(value.locations),
    })),
    warnings: [
      ...base.warnings,
      `Structured fields contained sensitive data which was redacted (level: ${privacyLevel}).`,
    ],
    externalSharingAllowed: false,
  };
}

function createContentHash(snapshot: PageSnapshot): string {
  const input = [
    snapshot.source.url,
    snapshot.source.title,
    ...snapshot.headings.map((heading) => heading.text),
    ...snapshot.textBlocks.map((block) => block.text),
  ].join('\n');
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
