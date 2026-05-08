import { DOMAIN_SPECS, type Domain, type Locale, LOCALES } from './types.js';

export function detectDomain(url: string): Domain {
  let host = '';
  try {
    host = new URL(url).host;
  } catch {
    return 'local';
  }
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) return 'local';
  if (host.endsWith('partstown.com.mx')) return 'commx';
  if (host.endsWith('partstown.ca')) return 'ca';
  if (host.endsWith('partstown.com')) return 'com';
  return 'local';
}

const LOCALE_SET = new Set<string>(LOCALES);

function stripLocalePrefix(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0 && LOCALE_SET.has(segments[0])) {
    segments.shift();
  }
  const rest = segments.join('/');
  return rest ? `/${rest}` : '/';
}

function applyLocalePrefix(pathname: string, locale: Locale): string {
  const stripped = stripLocalePrefix(pathname);
  return stripped === '/' ? `/${locale}/` : `/${locale}${stripped}`;
}

export interface BuildUrlInput {
  baseUrl: string;
  domain: Domain;
  locale: Locale;
}

export function buildUrl({ baseUrl, domain, locale }: BuildUrlInput): string {
  const parsed = new URL(baseUrl);
  const spec = DOMAIN_SPECS[domain];

  if (spec.host) {
    parsed.host = spec.host;
    parsed.protocol = 'https:';
    parsed.port = '';
  }

  if (spec.defaultLocale === locale) {
    parsed.pathname = stripLocalePrefix(parsed.pathname);
  } else {
    parsed.pathname = applyLocalePrefix(parsed.pathname, locale);
  }

  return parsed.toString();
}
