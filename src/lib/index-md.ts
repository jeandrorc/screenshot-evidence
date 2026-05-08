import { writeFileSync } from 'node:fs';
import { join, basename, relative } from 'node:path';
import type { CaptureFile, CaptureFailure, Locale, Viewport, Domain } from './types.js';

interface BuildIndexInput {
  outputDir: string;
  baseUrl: string;
  files: CaptureFile[];
  failures: CaptureFailure[];
  domains: Domain[];
  locales: Locale[];
  viewports: Viewport[];
}

export function writeIndexMd(input: BuildIndexInput): string {
  const { outputDir, baseUrl, files, failures, domains, locales, viewports } = input;
  const isLocal = domains.length === 1 && domains[0] === 'local';
  const lines: string[] = [];

  lines.push(`# Screenshot Evidence`);
  lines.push('');
  lines.push(`- **Base URL**: ${baseUrl}`);
  lines.push(`- **Captured**: ${new Date().toISOString()}`);
  lines.push(`- **Captures**: ${files.length}` + (failures.length ? ` (${failures.length} failed)` : ''));
  lines.push('');

  for (const domain of domains) {
    if (!isLocal) lines.push(`## Domain: \`${domain}\``);
    lines.push('');
    const header = ['Locale', ...viewports.map((v) => v[0].toUpperCase() + v.slice(1))];
    lines.push('| ' + header.join(' | ') + ' |');
    lines.push('| ' + header.map(() => '---').join(' | ') + ' |');

    for (const locale of locales) {
      const cells = [`\`${locale}\``];
      for (const viewport of viewports) {
        const file = files.find(
          (f) => f.domain === domain && f.locale === locale && f.viewport === viewport,
        );
        if (file) {
          const rel = relative(outputDir, file.path);
          cells.push(`![${viewport} ${locale}](${rel})`);
        } else {
          cells.push('—');
        }
      }
      lines.push('| ' + cells.join(' | ') + ' |');
    }
    lines.push('');
  }

  if (failures.length) {
    lines.push('## Failures');
    lines.push('');
    for (const f of failures) {
      lines.push(`- \`${f.domain}\` × \`${f.locale}\` × \`${f.viewport}\` — ${f.url}`);
      lines.push(`  - ${f.error}`);
    }
    lines.push('');
  }

  lines.push('## URLs');
  lines.push('');
  for (const file of files) {
    lines.push(`- ${basename(file.path)}: ${file.url}`);
  }
  lines.push('');

  const indexPath = join(outputDir, 'index.md');
  writeFileSync(indexPath, lines.join('\n'), 'utf8');
  return indexPath;
}
