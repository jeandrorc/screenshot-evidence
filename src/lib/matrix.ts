import { buildUrl } from './url-builder.js';
import type { CaptureConfig, MatrixItem } from './types.js';

export function buildMatrix(config: CaptureConfig): MatrixItem[] {
  const isLocal = config.domains.length === 1 && config.domains[0] === 'local';
  const items: MatrixItem[] = [];

  for (const domain of config.domains) {
    for (const locale of config.locales) {
      for (const viewport of config.viewports) {
        const url = buildUrl({ baseUrl: config.url, domain, locale });
        const filename = isLocal
          ? `${viewport}_${locale}.png`
          : `${viewport}_${domain}_${locale}.png`;
        items.push({ url, locale, domain, viewport, filename });
      }
    }
  }

  return items;
}
