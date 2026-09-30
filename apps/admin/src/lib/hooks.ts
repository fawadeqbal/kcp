'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { errorCode } from './api';
import { errorMessage, NETWORK_ERROR } from './errors';
import { pageFrom, readFilters, toQueryString } from './query';

type ApiResult<T> = { data?: T; error?: unknown; response: Response };

/**
 * Loads data from the API whenever `key` changes (for example the query string),
 * and again on `reload()`. Errors become a readable message.
 */
export function useLoad<T>(load: () => Promise<ApiResult<T>>, key: string) {
  // Remember which key the data belongs to, so new filters never show the old list.
  const [loaded, setLoaded] = useState<{ key: string; data: T } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let current = true;
    setError(null);
    load()
      .then(({ data: result, error: apiError, response }) => {
        if (!current) return;
        if (result === undefined) setError(errorMessage(errorCode(apiError), response.status));
        else setLoaded({ key, data: result });
      })
      .catch(() => current && setError(NETWORK_ERROR));
    return () => {
      current = false;
    };
    // `load` changes every render; `key` and `version` say when to load again.
  }, [key, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  // After reload() the previous data stays visible until the new data arrives.
  return { data: loaded?.key === key ? loaded.data : null, error, reload };
}

/** A search typed on another page (the overview's search box), for the list it opens. */
let handedOff: { path: string; values: Record<string, string> } | null = null;

/**
 * Opens a list with a private search already applied, without putting it in the URL:
 * call it right before navigating to `path`.
 */
export function handOffSearch(path: string, values: Record<string, string>) {
  handedOff = { path, values };
}

/**
 * Filters and page number kept in the URL, with a draft for the filter form.
 * `privateKeys` (free-text searches, which may hold an email or a child's username)
 * stay in memory instead, so they never reach browser history or this app's server
 * logs. (The API redacts them from its own request logs.)
 */
export function useUrlFilters<K extends string>(
  keys: readonly K[],
  privateKeys: readonly K[] = [],
) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const query = params.toString();
  const [privateApplied, setPrivateApplied] = useState<Partial<Record<K, string>>>(() => {
    if (handedOff?.path !== pathname) return {};
    const values: Partial<Record<K, string>> = {};
    for (const key of privateKeys) values[key] = handedOff.values[key];
    return values;
  });
  useEffect(() => {
    if (handedOff?.path === pathname) handedOff = null;
  }, [pathname]);

  // `keys` and `privateKeys` are module-level constants in every caller.
  const applied = useMemo(() => {
    const fromUrl = readFilters(new URLSearchParams(query), keys);
    for (const key of privateKeys) fromUrl[key] = privateApplied[key] ?? '';
    return fromUrl;
  }, [query, privateApplied]);
  const page = pageFrom(new URLSearchParams(query));
  const [draft, setDraft] = useState(applied);
  useEffect(() => setDraft(applied), [applied]);

  const go = useCallback(
    (filters: Partial<Record<K, string>>, nextPage: number) => {
      const inUrl: Partial<Record<K, string>> = {};
      const inMemory: Partial<Record<K, string>> = {};
      for (const [key, value] of Object.entries(filters) as [K, string][]) {
        if (privateKeys.includes(key)) inMemory[key] = value.trim();
        else inUrl[key] = value;
      }
      setPrivateApplied(inMemory);
      router.replace(`${pathname}${toQueryString({ ...inUrl, page: String(nextPage) })}`);
    },
    [router, pathname],
  );

  return {
    /** The filters in effect: what the list shows. */
    applied,
    page,
    /** What's typed in the filter form, applied on submit. */
    draft,
    setDraftValue: (key: K, value: string) => setDraft((d) => ({ ...d, [key]: value })),
    apply: () => go(draft, 1),
    reset: () => go({}, 1),
    setPage: (next: number) => go(applied, next),
    /** Changes when the filters or page change; use it as the load key. */
    key: `${query}|${JSON.stringify(privateApplied)}`,
  };
}
