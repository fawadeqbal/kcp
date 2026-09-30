import { isLocale, type Locale, LOCALES } from '@kcp/i18n';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

/*
 * Blog posts: apps/site/content/blog/<slug>.<locale>.mdx, one file per language, e.g.
 * parents-first.ur.mdx. Front matter (between --- lines) has title, date (YYYY-MM-DD)
 * and summary. Read while the site is built; the pages are static.
 */

export interface PostMeta {
  slug: string;
  locale: Locale;
  title: string;
  /** Publication date, YYYY-MM-DD. */
  date: string;
  summary: string;
}

export interface Post extends PostMeta {
  /** The MDX body, without front matter. */
  body: string;
}

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');
const FILE_NAME = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.([a-z]{2})\.mdx$/;
const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/** Splits and checks a post file. Throws with the file name when something is missing. */
export function parsePost(source: string, fileName: string): Post {
  const name = FILE_NAME.exec(fileName);
  const [, slug, locale] = name ?? [];
  if (!slug || !isLocale(locale)) {
    throw new Error(`${fileName}: blog files are named <slug>.<${LOCALES.join('|')}>.mdx`);
  }
  const match = FRONT_MATTER.exec(source);
  if (!match) throw new Error(`${fileName}: front matter (--- title, date, summary ---) missing`);
  const data: unknown = parseYaml(match[1] ?? '');
  const fields = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
  const text = (key: string): string => {
    const value = fields[key];
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error(`${fileName}: front matter needs a "${key}"`);
    }
    return value.trim();
  };
  const date = text('date');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    throw new Error(`${fileName}: date must look like 2026-09-30`);
  }
  return {
    slug,
    locale,
    title: text('title'),
    date,
    summary: text('summary'),
    body: source.slice(match[0].length),
  };
}

async function readPosts(): Promise<Post[]> {
  const files = (await readdir(BLOG_DIR)).filter((file) => file.endsWith('.mdx')).toSorted();
  return Promise.all(
    files.map(async (file) => parsePost(await readFile(path.join(BLOG_DIR, file), 'utf8'), file)),
  );
}

const newestFirst = (a: PostMeta, b: PostMeta) =>
  b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug);

/** The posts written in one language, newest first. */
export async function listPosts(locale: Locale): Promise<PostMeta[]> {
  return (await readPosts())
    .filter((post) => post.locale === locale)
    .map(({ slug, title, date, summary }) => ({ slug, locale, title, date, summary }))
    .toSorted(newestFirst);
}

export async function getPost(slug: string, locale: Locale): Promise<Post | null> {
  return (await readPosts()).find((post) => post.slug === slug && post.locale === locale) ?? null;
}

/** Every post in every language, for the sitemap: slug → languages it is written in. */
export async function postLanguages(): Promise<Map<string, Locale[]>> {
  const languages = new Map<string, Locale[]>();
  for (const post of await readPosts()) {
    languages.set(post.slug, [...(languages.get(post.slug) ?? []), post.locale]);
  }
  return languages;
}
