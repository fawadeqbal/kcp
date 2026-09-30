'use client';

import type { components } from '@kcp/api-client-ts';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export type Country = components['schemas']['CountryDto'];
export type Region = components['schemas']['RegionDto'];
export type Language = components['schemas']['LanguageDto'];

/** A name in the current language, falling back to English. */
export function localName(names: Record<string, string>, locale: string): string {
  return names[locale] ?? names.en ?? Object.values(names)[0] ?? '';
}

// Reference data rarely changes; load it once per visit.
let countries: Promise<Country[]> | undefined;
let languages: Promise<Language[]> | undefined;
const regions = new Map<string, Promise<Region[]>>();

export function useCountries(): Country[] {
  const [list, setList] = useState<Country[]>([]);
  useEffect(() => {
    countries ??= api.GET('/v1/countries').then(({ data }) => data ?? []);
    void countries.then(setList);
  }, []);
  return list;
}

export function useLanguages(): Language[] {
  const [list, setList] = useState<Language[]>([]);
  useEffect(() => {
    languages ??= api.GET('/v1/languages').then(({ data }) => data ?? []);
    void languages.then(setList);
  }, []);
  return list;
}

export function useRegions(countryCode: string): Region[] {
  const [list, setList] = useState<Region[]>([]);
  useEffect(() => {
    setList([]);
    if (!countryCode) return;
    let request = regions.get(countryCode);
    if (!request) {
      request = api
        .GET('/v1/countries/{code}/regions', { params: { path: { code: countryCode } } })
        .then(({ data }) => data ?? []);
      regions.set(countryCode, request);
    }
    let current = true;
    void request.then((data) => current && setList(data));
    return () => {
      current = false;
    };
  }, [countryCode]);
  return list;
}
