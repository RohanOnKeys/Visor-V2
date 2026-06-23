import type {
  ActionBlock,
  CompileRequest,
  ExtractionWarning,
  FormField,
  LayoutGroupBlock,
  PageSnapshot,
} from '@visor/protocol';
import { getSelectorHint } from './selectors.js';
import { isProbablyVisible } from './visibility.js';

const MAX_NODE_CAP = 12_000;

export function extractPageSnapshot(request: CompileRequest): PageSnapshot {
  const startedAt = performance.now();
  const headings: PageSnapshot['headings'] = [];
  const textBlocks: PageSnapshot['textBlocks'] = [];
  const links: PageSnapshot['links'] = [];
  const actions: PageSnapshot['actions'] = [];
  const layoutGroups: PageSnapshot['layoutGroups'] = [];
  const forms: PageSnapshot['forms'] = [];
  const tables: PageSnapshot['tables'] = [];
  const media: PageSnapshot['media'] = [];
  const warnings: ExtractionWarning[] = [];
  const labels = new Map<string, string>();
  const ignoreSelectors = request.siteProfile?.ignoreSelectors ?? [];
  const preserveSelectors = request.siteProfile?.preserveSelectors ?? [];
  let totalNodes = 0;
  let extractedNodes = 0;
  let ignoredNodes = 0;
  let sourceOrder = 0;
  let capped = false;

  const clean = (text: string): string => text.trim().replace(/\s+/g, ' ');
  const nextOrder = (): number => ++sourceOrder;
  const collectLabels = (root: ParentNode): void => {
    try {
      root.querySelectorAll('label').forEach((label) => {
        const target = label.getAttribute('for');
        const text = clean(label.textContent ?? '');
        if (target && text) labels.set(target, text);
      });
    } catch {
      // Some document fragments can reject selectors; extraction continues.
    }
  };
  collectLabels(document);

  const matchesAny = (element: Element, selectors: string[]): boolean =>
    selectors.some((selector) => {
      try {
        return element.matches(selector);
      } catch {
        warnings.push({
          type: 'other',
          message: 'Invalid site profile selector ignored.',
          details: selector,
        });
        return false;
      }
    });
  const directText = (element: Element): string =>
    clean(
      Array.from(element.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent ?? '')
        .join(' '),
    );
  const compactContainer = (element: Element): boolean => {
    const text = clean(element.textContent ?? '');
    if (text.length < 4 || text.length > 700) return false;
    if (
      element.querySelectorAll(
        'article, section, div, table, form, ul, ol, nav, aside, header, footer',
      ).length > 3
    ) return false;
    return element.querySelectorAll('a, span, strong, em, b, i, small, sup, sub')
      .length > 0;
  };
  const readableText = (element: Element, tag: string): string =>
    ['p', 'li', 'blockquote', 'td', 'span'].includes(tag) ||
    compactContainer(element)
      ? clean(element.textContent ?? '')
      : directText(element);
  const elementLabel = (element: Element): string => {
    const labelledBy = element
      .getAttribute('aria-labelledby')
      ?.split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .filter(Boolean)
      .join(' ');
    return clean(
      labelledBy ||
        element.getAttribute('aria-label') ||
        element.getAttribute('title') ||
        element.textContent ||
        (element as HTMLInputElement).value ||
        element.getAttribute('name') ||
        element.getAttribute('data-testid') ||
        '',
    );
  };
  const inferLayoutRole = (
    element: Element,
    tag: string,
  ): LayoutGroupBlock['role'] => {
    const role = element.getAttribute('role');
    const descriptor =
      `${tag} ${role ?? ''} ${element.getAttribute('class') ?? ''} ${element.getAttribute('data-testid') ?? ''}`.toLowerCase();
    if (descriptor.includes('dialog') || role === 'dialog') return 'dialog';
    if (descriptor.includes('nav') || role === 'navigation' || tag === 'nav') {
      return 'nav';
    }
    if (/\b(card|plan|tier|price)\b/.test(descriptor)) return 'card';
    if (tag === 'ul' || tag === 'ol' || role === 'list') return 'list';
    if (tag === 'section' || tag === 'article' || role === 'region') {
      return 'section';
    }
    return 'generic';
  };
  const shouldCaptureGroup = (element: Element, tag: string): boolean => {
    if (
      !['article', 'section', 'div', 'li', 'ul', 'ol', 'nav', 'aside'].includes(
        tag,
      )
    ) return false;
    const text = clean(element.textContent ?? '');
    if (text.length < 20 || text.length > 1200) return false;
    const descriptor =
      `${tag} ${element.getAttribute('role') ?? ''} ${element.getAttribute('class') ?? ''}`.toLowerCase();
    const structured =
      element.querySelectorAll(
        'button, a[href], img, video, svg, [role="button"], [aria-label]',
      ).length > 0;
    const card =
      /\b(plan|tier|price|premium|benefit|feature|subscription|monthly|yearly|\$\s?\d|\d+[.,]\d{2})\b/i.test(
        `${text} ${descriptor}`,
      );
    return (
      (structured || card) &&
      element.querySelectorAll('article, section, div, li, table, form').length <=
        12
    );
  };
  const childIds = <T extends { id: string; selectorHint: string }>(
    items: T[],
    selector: string,
  ): string[] =>
    items
      .filter(
        (item) =>
          item.selectorHint === selector ||
          item.selectorHint.startsWith(`${selector} > `),
      )
      .map((item) => item.id)
      .slice(0, 20);
  const backgroundImage = (element: Element): string | undefined =>
    window
      .getComputedStyle(element)
      .backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];
  const currentHeadingId = (): string | undefined => headings.at(-1)?.id;

  const traverse = (node: Node, parentHeadingId?: string): void => {
    if (capped) return;
    totalNodes++;
    if (totalNodes > MAX_NODE_CAP) {
      capped = true;
      warnings.push({
        type: 'node_limit',
        message: `Page size limit exceeded (processed over ${MAX_NODE_CAP} nodes). Extraction has been capped.`,
        details: `Processed nodes: ${totalNodes}`,
      });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      node.childNodes.forEach((child) => traverse(child, parentHeadingId));
      return;
    }

    const element = node as Element;
    const tag = element.tagName.toLowerCase();
    const preserved = matchesAny(element, preserveSelectors);
    if (
      ['script', 'style', 'noscript', 'template', 'head', 'meta', 'link', 'title'].includes(
        tag,
      ) ||
      (!preserved && matchesAny(element, ignoreSelectors)) ||
      (!preserved && !isProbablyVisible(element))
    ) {
      ignoredNodes++;
      return;
    }

    extractedNodes++;
    const order = nextOrder();
    const id = element.getAttribute('id') || `visor-el-${order}`;
    const selectorHint = getSelectorHint(element);

    if (shouldCaptureGroup(element, tag)) {
      const text = clean(element.textContent ?? '');
      layoutGroups.push({
        id: `${id}-group`,
        label: clean(
          element.getAttribute('aria-label') ||
            element.getAttribute('title') ||
            element.querySelector('h1, h2, h3, h4, h5, h6')?.textContent ||
            text.split(/(?<=[.!?])\s+/)[0]?.slice(0, 80) ||
            '',
        ),
        role: inferLayoutRole(element, tag),
        text,
        selectorHint,
        sourceOrder: order,
        childActionIds: childIds(actions, selectorHint),
        childMediaIds: childIds(media, selectorHint),
      });
    }

    const headingLevel = /^h([1-6])$/.exec(tag);
    if (headingLevel) {
      const text = clean(element.textContent ?? '');
      if (text) {
        headings.push({
          id,
          text,
          level: Number(headingLevel[1]),
          selectorHint,
          sourceOrder: order,
        });
        parentHeadingId = id;
      }
    } else if (tag === 'pre' || tag === 'code') {
      if (!(tag === 'code' && element.parentElement?.tagName === 'PRE')) {
        const text = element.textContent ?? '';
        if (text.trim()) {
          textBlocks.push({
            id,
            text,
            selectorHint,
            sourceOrder: order,
            parentHeadingId,
          });
        }
        return;
      }
    } else if (tag === 'table') {
      const headers = Array.from(element.querySelectorAll('th'))
        .map((cell) => clean(cell.textContent ?? ''))
        .filter(Boolean);
      const rows = Array.from(element.querySelectorAll('tr'))
        .map((row) =>
          Array.from(row.querySelectorAll('th, td'))
            .map((cell) => clean(cell.textContent ?? ''))
            .filter(Boolean),
        )
        .filter((row) => row.length > 0);
      tables.push({
        id,
        caption:
          clean(element.querySelector('caption')?.textContent ?? '') ||
          undefined,
        headers,
        rows,
        selectorHint,
        sourceOrder: order,
      });
      return;
    } else if (['img', 'video', 'audio', 'canvas', 'svg'].includes(tag)) {
      const image = element as HTMLImageElement;
      media.push({
        id,
        type: tag === 'img' || tag === 'svg' ? 'image' : tag as 'video' | 'audio' | 'canvas',
        alt:
          element.getAttribute('alt') ||
          element.getAttribute('aria-label') ||
          undefined,
        caption: element.getAttribute('title') || undefined,
        src:
          image.currentSrc ||
          element.getAttribute('src') ||
          element.getAttribute('data-src') ||
          element.getAttribute('srcset') ||
          undefined,
        selectorHint,
        sourceOrder: order,
      });
      if (tag === 'canvas') {
        warnings.push({
          type: 'canvas_only',
          message:
            'Page contains a Canvas element. Graphic contents inside Canvas are unreadable as HTML DOM.',
        });
      }
    } else if (tag === 'form') {
      const fields: FormField[] = [];
      const submitControls: ActionBlock[] = [];
      element
        .querySelectorAll('input, select, textarea, button')
        .forEach((control, index) => {
          const controlId =
            control.getAttribute('id') || `form-ctrl-${order}-${index}`;
          const controlTag = control.tagName.toLowerCase();
          const type = control.getAttribute('type') || 'text';
          let label = labels.get(control.getAttribute('id') || '');
          if (!label) label = clean(control.closest('label')?.textContent ?? '');
          if (!label) {
            label =
              control.getAttribute('aria-label') ||
              control.getAttribute('title') ||
              undefined;
          }
          if (
            controlTag === 'button' ||
            ['submit', 'button', 'image', 'reset'].includes(type)
          ) {
            submitControls.push({
              id: controlId,
              type: 'button',
              label: label || clean(control.textContent ?? '') || type,
              selectorHint: getSelectorHint(control),
              textContext: clean(control.textContent ?? ''),
              disabled: control.hasAttribute('disabled'),
              sourceOrder: order,
            });
          } else {
            const sensitive =
              type === 'password' ||
              type === 'one-time-code' ||
              control.getAttribute('autocomplete') === 'one-time-code';
            fields.push({
              id: controlId,
              name: control.getAttribute('name') || undefined,
              type,
              label: label || undefined,
              placeholder: control.getAttribute('placeholder') || undefined,
              required: control.hasAttribute('required'),
              disabled: control.hasAttribute('disabled'),
              value: sensitive
                ? undefined
                : (control as HTMLInputElement).value || undefined,
            });
          }
        });
      forms.push({
        id,
        selectorHint,
        label:
          element.getAttribute('aria-label') ||
          element.getAttribute('name') ||
          undefined,
        fields,
        submitControls,
        sourceOrder: order,
      });
    } else if (
      tag === 'button' ||
      element.getAttribute('role') === 'button' ||
      (tag === 'input' &&
        ['button', 'submit', 'image'].includes(
          element.getAttribute('type') || '',
        ))
    ) {
      actions.push({
        id,
        type: 'button',
        label: elementLabel(element) || 'Button',
        selectorHint,
        textContext: clean(element.textContent ?? ''),
        disabled: element.hasAttribute('disabled'),
        sourceOrder: order,
      });
    } else if (tag === 'a' && element.hasAttribute('href')) {
      const text = clean(element.textContent ?? '');
      const href = element.getAttribute('href') ?? '';
      if (element.getAttribute('role') === 'button') {
        actions.push({
          id,
          type: 'button',
          label: text || element.getAttribute('title') || 'Link Button',
          selectorHint,
          textContext: text,
          sourceOrder: order,
        });
      } else {
        links.push({
          id,
          text: text || href,
          href,
          title: element.getAttribute('title') || undefined,
          rel: element.getAttribute('rel') || undefined,
          selectorHint,
          sourceOrder: order,
        });
      }
    } else if (
      ['p', 'span', 'li', 'article', 'section', 'div', 'td', 'blockquote'].includes(
        tag,
      )
    ) {
      const text = readableText(element, tag);
      if (text.length > 3) {
        textBlocks.push({
          id,
          text,
          selectorHint,
          sourceOrder: order,
          parentHeadingId: parentHeadingId || currentHeadingId(),
        });
      }
      const background = backgroundImage(element);
      if (background) {
        media.push({
          id: `${id}-background`,
          type: 'image',
          alt: element.getAttribute('aria-label') || undefined,
          caption: element.getAttribute('title') || undefined,
          src: background,
          selectorHint,
          sourceOrder: order,
        });
      }
    }

    if (element.shadowRoot) {
      warnings.push({
        type: 'shadow_dom',
        message: 'Shadow DOM encountered and traversed.',
      });
      collectLabels(element.shadowRoot);
      element.shadowRoot.childNodes.forEach((child) =>
        traverse(child, parentHeadingId),
      );
    }
    if (tag === 'iframe') {
      try {
        const frame = element as HTMLIFrameElement;
        const frameDocument =
          frame.contentDocument || frame.contentWindow?.document;
        if (frameDocument) {
          collectLabels(frameDocument);
          frameDocument.childNodes.forEach((child) =>
            traverse(child, parentHeadingId),
          );
        } else {
          warnings.push({
            type: 'iframe',
            message:
              'Cross-origin iframe detected. Content is restricted due to browser same-origin policies.',
            details: `Source: ${frame.src || 'about:blank'}`,
          });
        }
      } catch (error) {
        warnings.push({
          type: 'iframe',
          message: 'Iframe access blocked. Same-origin validation failed.',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }
    element.childNodes.forEach((child) => traverse(child, parentHeadingId));
  };

  let root: Element | null = document.body;
  const mainSelector = request.siteProfile?.mainContentSelector;
  if (mainSelector) {
    try {
      root = document.querySelector(mainSelector) || document.body;
      if (root === document.body) {
        warnings.push({
          type: 'other',
          message:
            'Site profile main content selector did not match. Falling back to document body.',
          details: mainSelector,
        });
      }
    } catch {
      warnings.push({
        type: 'other',
        message:
          'Invalid site profile main content selector. Falling back to document body.',
        details: mainSelector,
      });
    }
  }
  if (root) traverse(root);
  appendWikipediaRegions(layoutGroups, warnings, media, nextOrder, clean);

  return {
    schemaVersion: 'page_snapshot.v1',
    source: {
      url: window.location.href,
      canonicalUrl:
        document.querySelector('link[rel="canonical"]')?.getAttribute('href') ||
        undefined,
      title: document.title,
      capturedAt: new Date().toISOString(),
      language: document.documentElement.lang || undefined,
    },
    metadata: {
      generator: 'Visor DOM Extractor v0.1.0',
      userAgent: navigator.userAgent,
      semanticRoute: isWikipediaPage() ? 'wikipedia_article' : 'generic',
    },
    headings,
    textBlocks,
    links,
    actions,
    layoutGroups: layoutGroups.map((group) => ({
      ...group,
      childActionIds: childIds(actions, group.selectorHint),
      childMediaIds: childIds(media, group.selectorHint),
    })),
    forms,
    tables,
    media,
    stats: {
      totalNodes,
      extractedNodes,
      ignoredNodes,
      timeElapsedMs: performance.now() - startedAt,
    },
    warnings,
  };
}

function isWikipediaPage(): boolean {
  return (
    /(^|\.)wikipedia\.org$/i.test(window.location.hostname) &&
    Boolean(document.querySelector('#mw-content-text, .mw-parser-output'))
  );
}

function appendWikipediaRegions(
  groups: LayoutGroupBlock[],
  warnings: ExtractionWarning[],
  media: PageSnapshot['media'],
  nextOrder: () => number,
  clean: (text: string) => string,
): void {
  if (!isWikipediaPage()) return;
  const parser = document.querySelector('.mw-parser-output');
  if (!parser) return;
  warnings.push({
    type: 'other',
    message:
      'Wikipedia semantic route applied: lead, TOC, infobox, sections, references, media, and nav are preserved as separate layout groups.',
  });
  const add = (
    id: string,
    label: string,
    role: LayoutGroupBlock['role'],
    text: string,
    element: Element,
  ): void => {
    if (!text || groups.some((group) => group.id === id)) return;
    groups.push({
      id,
      label,
      role,
      text,
      selectorHint: getSelectorHint(element),
      sourceOrder: nextOrder(),
      childActionIds: [],
      childMediaIds: [],
    });
  };
  const title = clean(
    document.querySelector('#firstHeading')?.textContent || document.title,
  );
  const leadText: string[] = [];
  for (const child of Array.from(parser.children)) {
    if (child.matches('h2, .mw-heading2, #toc, .vector-toc, table.infobox')) {
      break;
    }
    if (child.matches('p')) {
      const text = clean(child.textContent ?? '');
      if (text.length > 40) leadText.push(text);
    }
  }
  const firstParagraph = parser.querySelector('p');
  if (leadText.length && firstParagraph) {
    add('wikipedia-lead', `${title} lead`, 'lead', leadText.join('\n\n'), firstParagraph);
  }
  const toc = document.querySelector('#toc, .vector-toc, [aria-label="Contents"]');
  if (toc) {
    add(
      'wikipedia-toc',
      'Table of contents',
      'toc',
      Array.from(toc.querySelectorAll('a'))
        .map((item) => clean(item.textContent ?? ''))
        .filter(Boolean)
        .slice(0, 80)
        .join('\n'),
      toc,
    );
  }
  const infobox = parser.querySelector('table.infobox');
  if (infobox) {
    add(
      'wikipedia-infobox',
      clean(infobox.querySelector('caption, th')?.textContent || `${title} infobox`),
      'infobox',
      clean(infobox.textContent ?? ''),
      infobox,
    );
  }
  Array.from(parser.querySelectorAll('h2, .mw-heading2')).forEach(
    (heading, index) => {
      const label = clean(heading.textContent ?? '').replace(/\[edit\]$/i, '');
      const parts: string[] = [];
      let current = heading.nextElementSibling;
      while (current && !current.matches('h2, .mw-heading2')) {
        if (current.matches('p, ul, ol, table, figure, .thumb, .reflist')) {
          const text = clean(current.textContent ?? '');
          if (text.length > 20) parts.push(text);
        }
        current = current.nextElementSibling;
      }
      if (parts.length) {
        add(
          `wikipedia-section-${index + 1}`,
          label,
          /references|notes|bibliography|external links/i.test(label)
            ? 'references'
            : 'article_section',
          parts.join('\n\n').slice(0, 6000),
          heading,
        );
      }
    },
  );
  parser.querySelectorAll('figure, .thumb').forEach((figure, index) => {
    const image = figure.querySelector<HTMLImageElement>('img');
    const src = image?.currentSrc || image?.getAttribute('src') || undefined;
    if (!src) return;
    media.push({
      id: `wikipedia-media-${index + 1}`,
      type: 'image',
      alt: image?.getAttribute('alt') || undefined,
      caption:
        clean(
          figure.querySelector('figcaption, .thumbcaption')?.textContent ?? '',
        ) || undefined,
      src,
      selectorHint: getSelectorHint(figure),
      sourceOrder: nextOrder(),
    });
  });
}
