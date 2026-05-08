import { join } from 'node:path';
import { chromium, type Page } from 'playwright';
import { buildMatrix } from './matrix.js';
import { writeIndexMd } from './index-md.js';
import { resolveOutputDir } from './output.js';
import { deriveSlug, timestamp } from './slug.js';
import { viewportContextOptions } from './viewports.js';
import {
  COOKIE_DISMISS_SELECTORS,
  type CaptureConfig,
  type CaptureFailure,
  type CaptureFile,
  type CaptureResult,
} from './types.js';

async function tryClick(
  page: Page,
  selector: string,
  visibilityTimeoutMs: number,
): Promise<boolean> {
  try {
    const locator = page.locator(selector).first();
    if (await locator.isVisible({ timeout: visibilityTimeoutMs })) {
      await locator.click({ timeout: 2000 });
      await page.waitForTimeout(300);
      return true;
    }
  } catch {
    // swallow — pre-capture interactions are best-effort
  }
  return false;
}

async function runPreCaptureInteractions(
  page: Page,
  config: CaptureConfig,
): Promise<void> {
  if (config.dismissCookies) {
    for (const sel of COOKIE_DISMISS_SELECTORS) {
      if (await tryClick(page, sel, 1000)) break;
    }
  }
  for (const sel of config.clickSelectors ?? []) {
    await tryClick(page, sel, 2000);
  }
}

export interface CaptureCallbacks {
  onStart?: (total: number, outputDir: string) => void;
  onItemStart?: (index: number, total: number, filename: string, url: string) => void;
  onItemSuccess?: (index: number, total: number, filename: string) => void;
  onItemFailure?: (
    index: number,
    total: number,
    filename: string,
    error: string,
  ) => void;
  onDone?: (result: CaptureResult) => void;
}

export async function capture(
  config: CaptureConfig,
  callbacks: CaptureCallbacks = {},
): Promise<CaptureResult> {
  const matrix = buildMatrix(config);
  const total = matrix.length;
  const slug = config.slug ?? deriveSlug(config.url);
  const outputDir = resolveOutputDir({
    outputDir: config.outputDir,
    timestamp: timestamp(),
    slug,
  });

  callbacks.onStart?.(total, outputDir);

  const files: CaptureFile[] = [];
  const failures: CaptureFailure[] = [];

  const browser = await chromium.launch();
  try {
    let index = 0;
    for (const item of matrix) {
      index += 1;
      const filePath = join(outputDir, item.filename);
      callbacks.onItemStart?.(index, total, item.filename, item.url);

      const context = await browser.newContext(viewportContextOptions(item.viewport));
      const page = await context.newPage();
      try {
        await page.goto(item.url, { waitUntil: 'networkidle', timeout: 30000 });
        await runPreCaptureInteractions(page, config);
        if (config.waitSelector) {
          await page.waitForSelector(config.waitSelector, { timeout: 15000 });
        }
        await page.waitForTimeout(config.extraDelayMs ?? 1500);
        await page.screenshot({
          path: filePath,
          fullPage: config.fullPage ?? true,
        });
        files.push({
          path: filePath,
          locale: item.locale,
          viewport: item.viewport,
          domain: item.domain,
          url: item.url,
        });
        callbacks.onItemSuccess?.(index, total, item.filename);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        failures.push({
          url: item.url,
          locale: item.locale,
          domain: item.domain,
          viewport: item.viewport,
          error: message,
        });
        callbacks.onItemFailure?.(index, total, item.filename, message);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  const indexMdPath = writeIndexMd({
    outputDir,
    baseUrl: config.url,
    files,
    failures,
    domains: config.domains,
    locales: config.locales,
    viewports: config.viewports,
  });

  const result: CaptureResult = { outputDir, files, indexMdPath, failures };
  callbacks.onDone?.(result);
  return result;
}
