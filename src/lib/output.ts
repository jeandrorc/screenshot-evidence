import { mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export function packageRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, '..', '..');
}

export function defaultOutputBase(): string {
  return join(packageRoot(), 'output');
}

export function resolveOutputDir(opts: {
  outputDir?: string;
  timestamp: string;
  slug: string;
}): string {
  const base = opts.outputDir ?? defaultOutputBase();
  let candidate = join(base, `${opts.timestamp}_${opts.slug}`);
  let suffix = 0;
  while (existsSync(candidate)) {
    suffix += 1;
    candidate = join(base, `${opts.timestamp}_${opts.slug}-${suffix}`);
  }
  mkdirSync(candidate, { recursive: true });
  return candidate;
}
