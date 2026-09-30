/**
 * List pages keep their filters in the URL, so a filtered view can be reloaded or
 * shared with a colleague. These helpers read and write them.
 */
export type Filters = Record<string, string | undefined>;

export function readFilters<K extends string>(
  params: URLSearchParams,
  keys: readonly K[],
): Record<K, string> {
  return Object.fromEntries(keys.map((key) => [key, params.get(key)?.trim() ?? ''])) as Record<
    K,
    string
  >;
}

/** Drops empty values, and page 1 (the default). */
export function toQueryString(filters: Filters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (!value || (key === 'page' && value === '1')) continue;
    params.set(key, value);
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}

export function pageFrom(params: URLSearchParams): number {
  const page = Number(params.get('page'));
  return Number.isInteger(page) && page > 0 ? page : 1;
}
