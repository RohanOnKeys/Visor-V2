import type { AgentContext } from '@visor/protocol';

export function formatAsMarkdown(context: AgentContext): string {
  const lines = [
    `# ${context.source.title}`,
    `**Source URL:** [${context.source.url}](${context.source.url})`,
    `**Captured At:** ${context.source.capturedAt}`,
    `**Page Type:** ${context.pageClassification.type} (confidence: ${(context.pageClassification.confidence * 100).toFixed(0)}%)`,
    `**Token Count:** ${context.tokenProfile.compiledEstimatedTokens} tokens`,
    '',
  ];
  if (context.privacyReport.riskLevel !== 'low') {
    lines.push(
      '> [!WARNING]',
      `> **Privacy Risk Warning:** Visor classified this page with a **${context.privacyReport.riskLevel.toUpperCase()}** privacy risk level.`,
      ...context.privacyReport.warnings.map((warning) => `> - ${warning}`),
      '',
    );
  }
  if (context.summary.short) {
    lines.push('## Page Summary', context.summary.short, '');
  }
  lines.push('## Page Content');
  for (const block of context.mainContent) {
    if (block.kind === 'heading') {
      lines.push(
        `${'#'.repeat(Math.min(5, block.headingPath.length + 2))} ${block.text}`,
      );
    } else if (block.kind === 'code') {
      lines.push('```', block.text, '```');
    } else if (block.kind === 'quote') {
      lines.push(`> ${block.text}`);
    } else {
      lines.push(block.text);
    }
    lines.push('');
  }
  if (context.layoutGroups.length > 0) {
    lines.push('## Semantic Regions');
    for (const group of [...context.layoutGroups]
      .filter((item) => item.importanceScore >= 5)
      .sort((left, right) => right.importanceScore - left.importanceScore)) {
      lines.push(`### ${group.label} (${group.role})`, group.text);
      if (group.childActionIds.length > 0) {
        lines.push(`Actions in group: ${group.childActionIds.join(', ')}`);
      }
      lines.push('');
    }
  }
  if (context.dataElements.length > 0) {
    lines.push(
      '## Data Elements',
      ...context.dataElements.map(
        (element) => `- **${element.label}:** ${element.value}`,
      ),
      '',
    );
  }
  if (context.actionableElements.length > 0) {
    lines.push(
      '## Actionable Elements',
      ...context.actionableElements.map(
        (element) =>
          `- **${element.label}** [${element.type}] - Selector: \`${element.selectorHint}\`${element.disabled ? ' (Disabled)' : ''}${element.privacySensitive ? ' [Sensitive]' : ''}`,
      ),
      '',
    );
  }
  if (context.tables.length > 0) {
    lines.push('## Tables');
    for (const table of context.tables) {
      lines.push(
        table.caption
          ? `### Table: ${table.caption}`
          : `### Table (Selector: \`${table.selectorHint}\`)`,
      );
      if (table.headers.length > 0) {
        lines.push(
          `| ${table.headers.join(' | ')} |`,
          `| ${table.headers.map(() => '---').join(' | ')} |`,
        );
      }
      lines.push(...table.rows.map((row) => `| ${row.join(' | ')} |`), '');
    }
  }
  if (context.forms.length > 0) {
    lines.push('## Forms');
    for (const form of context.forms) {
      lines.push(
        `### Form: ${form.label ?? 'Unnamed Form'} (Selector: \`${form.selectorHint}\`)`,
      );
      for (const field of form.fields) {
        lines.push(
          `- Field **${field.label ?? field.name ?? 'Unnamed'}** [Type: ${field.type}]${field.required ? ' *' : ''}${field.placeholder ? ` (placeholder: "${field.placeholder}")` : ''}${field.value ? ` [Value: ${field.value}]` : ''}`,
        );
      }
      lines.push('');
    }
  }
  if (context.media.length > 0) {
    lines.push(
      '## Media',
      ...context.media.map(
        (item) =>
          `- ${item.type}: ${item.alt ?? item.caption ?? item.src ?? item.id}`,
      ),
      '',
    );
  }
  return lines.join('\n').trim();
}

export function formatAsPromptBlock(context: AgentContext): string {
  const lines = [
    `Source URL: ${context.source.url}`,
    `Page Title: ${context.source.title}`,
    '',
  ];
  if (context.summary.short) {
    lines.push(`Summary:\n${context.summary.short}`, '');
  }
  for (const block of context.mainContent) {
    if (block.kind === 'heading') lines.push(`[Heading] ${block.text}`);
    else if (block.kind === 'code') {
      lines.push(`[Code Block]\n${block.text}\n[End Code Block]`);
    } else lines.push(block.text);
  }
  if (context.layoutGroups.length > 0) {
    lines.push(
      '\nSemantic Regions:',
      ...context.layoutGroups
        .filter((group) => group.importanceScore >= 5)
        .map((group) => `- ${group.label} (${group.role}): ${group.text}`),
    );
  }
  if (context.dataElements.length > 0) {
    lines.push(
      '\nStructured Data Elements:',
      ...context.dataElements.map(
        (element) => `- ${element.label}: ${element.value}`,
      ),
    );
  }
  if (context.actionableElements.length > 0) {
    lines.push(
      '\nActionable Elements:',
      ...context.actionableElements.map(
        (element) =>
          `- Element: "${element.label}" (Type: ${element.type}, Selector: ${element.selectorHint})`,
      ),
    );
  }
  return lines.join('\n');
}
