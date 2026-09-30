import { readFileSync } from 'node:fs';
import { directionOf, isLocale, LOCALES } from './index.js';

type Tree = { [key: string]: string | Tree };

const load = (locale: string): Tree =>
  JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), 'utf8')) as Tree;

/** Flattens { a: { b: 'x' } } into { 'a.b': 'x' }. */
function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string'
      ? { ...acc, [path]: value }
      : { ...acc, ...flatten(value, path) };
  }, {});
}

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).toSorted();

describe('messages', () => {
  const english = flatten(load('en'));

  it.each(LOCALES.filter((l) => l !== 'en'))(
    '%s has exactly the same keys as English',
    (locale) => {
      expect(Object.keys(flatten(load(locale))).toSorted()).toEqual(
        Object.keys(english).toSorted(),
      );
    },
  );

  it.each(LOCALES)('%s has no empty texts', (locale) => {
    const empty = Object.entries(flatten(load(locale)))
      .filter(([, text]) => !text.trim())
      .map(([key]) => key);
    expect(empty).toEqual([]);
  });

  it.each(LOCALES.filter((l) => l !== 'en'))(
    '%s keeps every {placeholder} from English',
    (locale) => {
      const translated = flatten(load(locale));
      const mismatched = Object.entries(english)
        .filter(
          ([key, text]) => placeholders(translated[key] ?? '').join() !== placeholders(text).join(),
        )
        .map(([key]) => key);
      expect(mismatched).toEqual([]);
    },
  );
});

describe('locale helpers', () => {
  it('knows the writing direction', () => {
    expect(directionOf('en')).toBe('ltr');
    expect(directionOf('ar')).toBe('rtl');
    expect(directionOf('ur')).toBe('rtl');
  });

  it('recognises supported locales only', () => {
    expect(isLocale('ur')).toBe(true);
    expect(isLocale('fr')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});
