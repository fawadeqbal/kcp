import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/*
 * Tailwind quietly ignores a class it doesn't know, so a colour that isn't in the
 * design system (an old token name, a stock palette colour) would just vanish. This
 * reads every web app's source and checks each colour class against theme.css.
 */

const root = new URL('../../..', import.meta.url).pathname;
const theme = readFileSync(new URL('./theme.css', import.meta.url), 'utf8');

/** The colours theme.css defines (light block), e.g. "brand-100", "canvas". */
const THEME_COLORS = new Set(
  [...(theme.match(/@theme\s*\{([\s\S]*?)\n\}/)?.[1] ?? '').matchAll(/--color-([\w-]+):/g)].map(
    (m) => m[1]!,
  ),
);
const ALWAYS = new Set(['white', 'black', 'transparent', 'current', 'inherit']);

/** Utilities whose value is a colour. */
const PREFIXES = [
  'bg',
  'text',
  'border',
  'border-s',
  'border-e',
  'border-t',
  'border-b',
  'ring',
  'ring-offset',
  'outline',
  'fill',
  'stroke',
  'from',
  'via',
  'to',
  'divide',
  'accent',
  'caret',
  'decoration',
  'placeholder',
  'shadow',
];
/** Stock Tailwind palettes and the retired placeholder names: none may be used. */
const FORBIDDEN =
  /^(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+$|^(success|warning|accent|brand-50|brand-600\/10)$/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (name === 'node_modules' || name.startsWith('.')) return [];
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(tsx?|css)$/.test(name) && !/\.spec\.tsx?$/.test(name) ? [path] : [];
  });
}

const SOURCES = ['apps/web/src', 'apps/admin/src', 'apps/site/src', 'packages/ui/src'].flatMap(
  (dir) => files(join(root, dir)),
);

describe('colour classes', () => {
  it('reads the theme', () => {
    expect(THEME_COLORS.has('canvas')).toBe(true);
    expect(THEME_COLORS.has('brand-100')).toBe(true);
    expect(SOURCES.length).toBeGreaterThan(50);
  });

  it('only uses colours of the design system', () => {
    const wrong: string[] = [];
    const pattern = new RegExp(
      `(?<![\\w-])(?:[\\w-]+:)*(?:${PREFIXES.join('|')})-([a-z][\\w-]*(?:/\\d+)?)(?![\\w-])`,
      'g',
    );
    for (const file of SOURCES) {
      const text = readFileSync(file, 'utf8');
      for (const match of text.matchAll(pattern)) {
        const value = match[1]!;
        const name = value.replace(/\/\d+$/, '');
        if (THEME_COLORS.has(name) || ALWAYS.has(name)) continue;
        if (FORBIDDEN.test(value) || FORBIDDEN.test(name)) {
          wrong.push(`${file.slice(root.length)}: ${match[0]}`);
        }
      }
    }
    expect(wrong).toEqual([]);
  });
});
