import createClient, { type ClientOptions } from 'openapi-fetch';
import type { paths } from './schema.js';

export type * from './schema.js';

export interface ApiClientOptions extends Omit<ClientOptions, 'baseUrl'> {
  /** API origin, e.g. "http://localhost:3000" or "https://api.example.com". */
  baseUrl: string;
}

/**
 * Typed client for the Kids Coding Platform API. Paths, parameters and response
 * bodies are checked at compile time against the API's OpenAPI document.
 *
 * @example
 *   const api = createApiClient({ baseUrl: 'http://localhost:3000' });
 *   const { data, error } = await api.GET('/v1/health/live');
 */
export function createApiClient({ baseUrl, ...options }: ApiClientOptions) {
  return createClient<paths>({
    baseUrl: baseUrl.replace(/\/+$/, ''),
    credentials: 'include',
    ...options,
  });
}

export type ApiClient = ReturnType<typeof createApiClient>;
