#!/usr/bin/env node
import { Command } from 'commander';
import { input, checkbox, confirm } from '@inquirer/prompts';
import { execSync } from 'node:child_process';
import { capture } from './lib/capture.js';
import { detectDomain } from './lib/url-builder.js';
import { deriveSlug } from './lib/slug.js';
import {
  CaptureConfigSchema,
  DOMAINS,
  LOCALES,
  VIEWPORTS,
  type Domain,
  type Locale,
  type Viewport,
} from './lib/types.js';

interface CliOptions {
  outputDir?: string;
  interactive?: boolean;
  locales?: string;
  domains?: string;
  viewports?: string;
  waitSelector?: string;
  delay?: string;
  slug?: string;
  click?: string[];
  dismissCookies?: boolean;
}

function collectRepeatable(value: string, previous: string[] = []): string[] {
  return [...previous, value];
}

const program = new Command();
program
  .name('screenshot-evidence')
  .description(
    'Capture multi-locale × multi-viewport × multi-domain screenshots for MR/QA evidence',
  )
  .argument('[url]', 'URL to capture')
  .option('--output-dir <path>', 'Custom output directory base')
  .option('--no-interactive', 'Skip prompts; use defaults or flag values')
  .option(
    '--locales <list>',
    `Comma-separated locales (${LOCALES.join(',')})`,
  )
  .option(
    '--domains <list>',
    `Comma-separated domains (${DOMAINS.join(',')})`,
  )
  .option(
    '--viewports <list>',
    `Comma-separated viewports (${VIEWPORTS.join(',')})`,
  )
  .option('--wait-selector <selector>', 'Wait for selector before capture')
  .option('--delay <ms>', 'Extra delay after networkidle in ms', '1500')
  .option('--slug <slug>', 'Override the slug derived from the URL')
  .option(
    '--click <selector>',
    'CSS selector to click before capture (repeatable, best-effort)',
    collectRepeatable,
    [],
  )
  .option(
    '--dismiss-cookies',
    'Try common cookie banner accept/close buttons (OneTrust, etc.) before capture',
  )
  .action(async (urlArg: string | undefined, opts: CliOptions) => {
    try {
      await run(urlArg, opts);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\n[31mError:[0m ${message}`);
      process.exit(1);
    }
  });

program.parseAsync();

function parseList<T extends string>(
  raw: string | undefined,
  allowed: readonly T[],
): T[] | undefined {
  if (!raw) return undefined;
  const set = new Set<string>(allowed);
  const items = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const item of items) {
    if (!set.has(item)) {
      throw new Error(`Invalid value "${item}". Allowed: ${allowed.join(', ')}`);
    }
  }
  return items as T[];
}

async function run(urlArg: string | undefined, opts: CliOptions): Promise<void> {
  const url =
    urlArg ??
    (opts.interactive === false ? '' : await input({ message: 'URL to capture:' }));
  if (!url) throw new Error('URL is required');

  const detectedDomain = detectDomain(url);
  const isLocal = detectedDomain === 'local';

  const slug =
    opts.slug ?? (opts.interactive === false
      ? deriveSlug(url)
      : await input({
          message: 'Slug for output folder:',
          default: deriveSlug(url),
        }));

  let locales = parseList<Locale>(opts.locales, LOCALES);
  let domains = parseList<Domain>(opts.domains, DOMAINS);
  let viewports = parseList<Viewport>(opts.viewports, VIEWPORTS);

  if (!opts.interactive === false) {
    if (!locales) {
      locales = await checkbox({
        message: 'Locales:',
        choices: LOCALES.map((l) => ({
          name: l,
          value: l,
          checked: l === 'en' || l === 'es' || l === 'fr',
        })),
        required: true,
      });
    }
    if (!domains) {
      if (isLocal) {
        domains = ['local'];
      } else {
        domains = await checkbox({
          message: 'Domains:',
          choices: [
            { name: '.com', value: 'com' as const, checked: detectedDomain === 'com' },
            { name: '.com.mx', value: 'commx' as const, checked: detectedDomain === 'commx' },
            { name: '.ca', value: 'ca' as const, checked: detectedDomain === 'ca' },
          ],
          required: true,
        });
      }
    }
    if (!viewports) {
      viewports = await checkbox({
        message: 'Viewports:',
        choices: [
          { name: 'Desktop (1440×900)', value: 'desktop' as const, checked: true },
          { name: 'Mobile (iPhone 13)', value: 'mobile' as const, checked: true },
          { name: 'Tablet (iPad Mini)', value: 'tablet' as const, checked: false },
        ],
        required: true,
      });
    }
  } else {
    locales ??= ['en', 'es', 'fr'];
    domains ??= isLocal ? ['local'] : ['com'];
    viewports ??= ['desktop', 'mobile'];
  }

  const extraDelayMs = Number.parseInt(opts.delay ?? '1500', 10);
  const waitSelector = opts.waitSelector;

  const config = CaptureConfigSchema.parse({
    url,
    slug,
    locales,
    domains,
    viewports,
    outputDir: opts.outputDir,
    waitSelector,
    extraDelayMs,
    fullPage: true,
    clickSelectors: opts.click && opts.click.length > 0 ? opts.click : undefined,
    dismissCookies: opts.dismissCookies,
  });

  const total = locales.length * domains.length * viewports.length;
  console.log(
    `\n[36m${total} screenshots:[0m ${domains.join('+')} × ${locales.join('+')} × ${viewports.join('+')}`,
  );

  const proceed = opts.interactive === false
    ? true
    : await confirm({ message: 'Continue?', default: true });
  if (!proceed) {
    console.log('Aborted.');
    return;
  }

  const result = await capture(config, {
    onStart: (n, dir) => console.log(`Output: ${dir}\n`),
    onItemStart: (i, n, name) => process.stdout.write(`[${i}/${n}] ${name} ... `),
    onItemSuccess: () => console.log('[32m✓[0m'),
    onItemFailure: (_i, _n, _name, err) =>
      console.log(`[31m✗[0m ${err}`),
  });

  console.log(`\nDone → ${result.outputDir}`);
  console.log(`Index: ${result.indexMdPath}`);
  if (result.failures.length) {
    console.log(`[31m${result.failures.length} failure(s)[0m`);
  }

  if (process.platform === 'darwin') {
    try {
      execSync(`open "${result.outputDir}"`);
    } catch {
      // ignore
    }
  }
}
