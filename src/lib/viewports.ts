import { devices, type BrowserContextOptions } from 'playwright';
import type { Viewport } from './types.js';

export function viewportContextOptions(viewport: Viewport): BrowserContextOptions {
  switch (viewport) {
    case 'desktop':
      return {
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      };
    case 'mobile':
      return devices['iPhone 13'];
    case 'tablet':
      return devices['iPad Mini'];
    default: {
      const _exhaustive: never = viewport;
      throw new Error(`Unknown viewport: ${_exhaustive}`);
    }
  }
}
