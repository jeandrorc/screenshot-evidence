export function deriveSlug(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return 'page';
  }

  const safeDecode = (s: string): string => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  };

  const pathPart = parsed.pathname
    .split('/')
    .filter(Boolean)
    .map(safeDecode)
    .join('-');

  const queryPart = Array.from(parsed.searchParams.entries())
    .filter(([, value]) => value)
    .map(([key, value]) => `${safeDecode(key)}-${safeDecode(value)}`)
    .join('-');

  const raw = [pathPart, queryPart].filter(Boolean).join('-') || 'page';

  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'page';
}

export function timestamp(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `_${pad(now.getHours())}-${pad(now.getMinutes())}`
  );
}
