import { z } from 'zod';

export const VIEWPORTS = ['desktop', 'mobile', 'tablet'] as const;
export const LOCALES = ['en', 'es', 'fr', 'es_MX', 'fr_CA'] as const;
export const DOMAINS = ['local', 'com', 'commx', 'ca'] as const;

export type Viewport = (typeof VIEWPORTS)[number];
export type Locale = (typeof LOCALES)[number];
export type Domain = (typeof DOMAINS)[number];

export const ViewportSchema = z.enum(VIEWPORTS);
export const LocaleSchema = z.enum(LOCALES);
export const DomainSchema = z.enum(DOMAINS);

export const CaptureConfigSchema = z.object({
  url: z.string().url(),
  slug: z.string().optional(),
  locales: z.array(LocaleSchema).min(1),
  domains: z.array(DomainSchema).min(1),
  viewports: z.array(ViewportSchema).min(1),
  outputDir: z.string().optional(),
  waitSelector: z.string().optional(),
  extraDelayMs: z.number().int().nonnegative().optional(),
  fullPage: z.boolean().optional(),
  clickSelectors: z.array(z.string()).optional(),
  dismissCookies: z.boolean().optional(),
});

export const COOKIE_DISMISS_SELECTORS: string[] = [
  '#onetrust-accept-btn-handler',
  '#onetrust-close-btn-container button',
  '.ot-close-btn',
  '#truste-consent-button',
  'button[aria-label="Accept Cookies"]',
  'button[aria-label="Accept all cookies"]',
];

export type CaptureConfig = z.infer<typeof CaptureConfigSchema>;

export interface MatrixItem {
  url: string;
  locale: Locale;
  domain: Domain;
  viewport: Viewport;
  filename: string;
}

export interface CaptureFile {
  path: string;
  locale: Locale;
  viewport: Viewport;
  domain: Domain;
  url: string;
}

export interface CaptureFailure {
  url: string;
  locale: Locale;
  domain: Domain;
  viewport: Viewport;
  error: string;
}

export interface CaptureResult {
  outputDir: string;
  files: CaptureFile[];
  indexMdPath: string;
  failures: CaptureFailure[];
}

export interface DomainSpec {
  id: Domain;
  host: string | null;
  defaultLocale: Locale | null;
}

export const DOMAIN_SPECS: Record<Domain, DomainSpec> = {
  local: { id: 'local', host: null, defaultLocale: 'en' },
  com: { id: 'com', host: 'www.partstown.com', defaultLocale: 'en' },
  commx: { id: 'commx', host: 'www.partstown.com.mx', defaultLocale: 'es_MX' },
  ca: { id: 'ca', host: 'www.partstown.ca', defaultLocale: 'en' },
};
