/**
 * Turns a hub milestone's static site (its files, from the API) into one self-contained
 * HTML page per .html file: stylesheets and scripts inlined, pictures and fonts as data:
 * URLs, links between pages marked so the preview can switch pages. The result runs in
 * a sandboxed frame that may not load anything from this domain or call any server.
 */

/** A file of the preview, as the API sends it (text files as text, others base64). */
export interface SiteFile {
  path: string;
  type: string;
  text: string | null;
  base64: string | null;
}

/** Sent by a page when a link to another page of the site is clicked. */
export const PAGE_MESSAGE = 'kcp:preview-page';
/** The attribute on links to another page of the site (its path). */
export const PAGE_ATTRIBUTE = 'data-kcp-page';

const MAX_IMPORT_DEPTH = 4;
const MAX_INLINED_CSS = 4_000_000;

/**
 * The site path a reference points to, seen from the file `from`, or null when it
 * points elsewhere (another website, a data: URL, a #fragment of the same page).
 * "/x" starts at the top of the site; ".." never climbs above it; "dir/" means
 * "dir/index.html".
 */
export function resolvePath(from: string, reference: string): string | null {
  const value = reference.trim();
  if (!value || value.startsWith('#') || value.startsWith('//')) return null;
  if (/^[a-z][a-z\d+.-]*:/i.test(value)) return null;
  const clean = value.split(/[?#]/)[0] ?? '';
  if (!clean) return null;
  let decoded = clean;
  try {
    decoded = decodeURIComponent(clean);
  } catch {
    // Keep it as written.
  }
  const parts = decoded.startsWith('/') ? [] : from.split('/').slice(0, -1);
  for (const part of decoded.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  if (decoded.endsWith('/') || parts.length === 0) parts.push('index.html');
  return parts.join('/');
}

export function dataUrl(type: string, file: { text: string | null; base64: string | null }) {
  return file.base64 !== null
    ? `data:${type};base64,${file.base64}`
    : `data:${type};charset=utf-8,${encodeURIComponent(file.text ?? '')}`;
}

const isHtml = (file: SiteFile) => file.type === 'text/html';

/** The files of one preview, and the rewriting of references between them. */
export class Site {
  private readonly files = new Map<string, SiteFile>();

  constructor(files: SiteFile[]) {
    for (const file of files) this.files.set(file.path, file);
  }

  /** The file a reference from `from` points to (a folder means its index.html). */
  find(from: string, reference: string): SiteFile | null {
    const path = resolvePath(from, reference);
    if (path === null) return null;
    return this.files.get(path) ?? this.files.get(`${path}/index.html`) ?? null;
  }

  /** The site's pages: index.html first, then the others by path. */
  pages(): string[] {
    const pages = [...this.files.values()].filter(isHtml).map((file) => file.path);
    return pages.toSorted((a, b) =>
      a === 'index.html' ? -1 : b === 'index.html' ? 1 : a < b ? -1 : a > b ? 1 : 0,
    );
  }

  has(path: string): boolean {
    const file = this.files.get(path);
    return file !== undefined && isHtml(file);
  }

  /** A picture, font or other file as a data: URL (not pages or stylesheets). */
  url(from: string, reference: string): string | null {
    const file = this.find(from, reference);
    if (!file || isHtml(file) || file.type === 'text/css') return null;
    return dataUrl(file.type, file);
  }

  /** Characters of stylesheets a page may inline (a stylesheet importing itself, or many). */
  private budget = MAX_INLINED_CSS;

  /**
   * A stylesheet (seen from `from`) with its @import rules replaced by the imported
   * stylesheets themselves and its url(…) references as data: URLs. An import that
   * goes round in a circle, too deep, or past the page's budget is left as it was.
   */
  css(from: string, css: string, depth = 0, chain: readonly string[] = [from]): string {
    const imported = css.replace(
      /@import\s+(?:url\(\s*)?(["'])([^"']+)\1\s*\)?([^;]*);/gi,
      (match, _quote: string, reference: string, media: string) => {
        // Every import costs something, so even empty files can't make endless work.
        this.budget -= match.length;
        const file = this.find(from, reference);
        if (
          depth >= MAX_IMPORT_DEPTH ||
          this.budget <= 0 ||
          file?.type !== 'text/css' ||
          file.text === null ||
          chain.includes(file.path)
        ) {
          return match;
        }
        const inner = this.css(file.path, file.text, depth + 1, [...chain, file.path]);
        this.budget -= inner.length;
        if (this.budget < 0) return match;
        return media.trim() ? `@media ${media.trim()} {\n${inner}\n}` : inner;
      },
    );
    return imported.replace(
      /url\(\s*(["']?)([^"')]+)\1\s*\)/gi,
      (match, _quote: string, reference: string) => {
        if (reference.startsWith('data:')) return match;
        const url = this.url(from, reference);
        if (url) return `url("${url}")`;
        // A file of the site that isn't there: nothing (not this domain's file).
        return resolvePath(from, reference) !== null && this.find(from, reference) === null
          ? 'url("data:,")'
          : match;
      },
    );
  }

  /** A srcset ("a.png 1x, b.png 2x") with the site's pictures as data: URLs. */
  srcset(from: string, value: string): string {
    return value
      .split(',')
      .map((candidate) => {
        const [reference = '', ...descriptor] = candidate.trim().split(/\s+/);
        const url = this.url(from, reference);
        if (!url && resolvePath(from, reference) !== null && !this.find(from, reference)) {
          return null;
        }
        return [url ?? reference, ...descriptor].join(' ');
      })
      .filter((candidate) => candidate !== null)
      .join(', ');
  }

  /**
   * One page, self-contained, or null when there's no such page. `parser` parses the
   * HTML without running it (a DOMParser document runs no scripts and loads nothing).
   */
  page(path: string, parser: DOMParser): string | null {
    const file = this.files.get(path);
    if (!file || !isHtml(file) || file.text === null) return null;
    this.budget = MAX_INLINED_CSS;
    const doc = parser.parseFromString(file.text, 'text/html');
    for (const base of doc.querySelectorAll('base')) base.remove();
    // A reference to a file of the site that isn't there would ask this domain for it:
    // it goes (or, for a link to a page, leads nowhere).
    const missing = (reference: string) =>
      resolvePath(path, reference) !== null && this.find(path, reference) === null;

    for (const link of doc.querySelectorAll<HTMLLinkElement>('link[href]')) {
      const href = link.getAttribute('href') ?? '';
      const rel = (link.getAttribute('rel') ?? '').toLowerCase().split(/\s+/);
      const target = this.find(path, href);
      if (missing(href)) {
        link.remove();
        continue;
      }
      if (rel.includes('stylesheet')) {
        if (target?.type !== 'text/css' || target.text === null) continue;
        const style = doc.createElement('style');
        const media = link.getAttribute('media');
        if (media) style.setAttribute('media', media);
        style.textContent = this.css(target.path, target.text);
        link.replaceWith(style);
      } else {
        const url = this.url(path, href);
        if (url) link.setAttribute('href', url);
      }
    }
    for (const style of doc.querySelectorAll('style')) {
      style.textContent = this.css(path, style.textContent ?? '');
    }
    for (const node of doc.querySelectorAll<HTMLElement>('[style]')) {
      node.setAttribute('style', this.css(path, node.getAttribute('style') ?? ''));
    }
    for (const script of doc.querySelectorAll<HTMLScriptElement>('script[src]')) {
      const src = script.getAttribute('src') ?? '';
      if (missing(src)) {
        script.remove();
        continue;
      }
      const target = this.find(path, src);
      if (target?.type !== 'text/javascript' || target.text === null) continue;
      script.removeAttribute('src');
      // Inline, so "</script" inside the code must not end the element.
      script.textContent = target.text.replace(/<\/script/gi, '<\\/script');
    }
    for (const [selector, attribute] of [
      ['img[src], source[src], audio[src], video[src], track[src], embed[src]', 'src'],
      ['input[type="image" i][src]', 'src'],
      ['video[poster]', 'poster'],
      ['image[href], use[href]', 'href'],
      ['object[data]', 'data'],
    ] as const) {
      for (const node of doc.querySelectorAll(selector)) {
        const value = node.getAttribute(attribute) ?? '';
        const url = this.url(path, value);
        if (url) node.setAttribute(attribute, url);
        else if (missing(value)) node.removeAttribute(attribute);
      }
    }
    for (const node of doc.querySelectorAll('img[srcset], source[srcset]')) {
      node.setAttribute('srcset', this.srcset(path, node.getAttribute('srcset') ?? ''));
    }
    for (const link of doc.querySelectorAll('a[href], area[href]')) {
      const href = link.getAttribute('href') ?? '';
      const target = this.find(path, href);
      if (target && isHtml(target)) link.setAttribute(PAGE_ATTRIBUTE, target.path);
      // A page that isn't in the preview: the click does nothing.
      else if (missing(href)) link.setAttribute(PAGE_ATTRIBUTE, resolvePath(path, href) ?? '');
    }

    // Links to the site's other pages switch the preview's page (the frame can't load them).
    const navigate = doc.createElement('script');
    navigate.textContent = `document.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('[${PAGE_ATTRIBUTE}]');if(!a)return;e.preventDefault();parent.postMessage({type:'${PAGE_MESSAGE}',path:a.getAttribute('${PAGE_ATTRIBUTE}')},'*');});`;
    doc.head.prepend(navigate);
    return `<!doctype html>\n${doc.documentElement.outerHTML}`;
  }
}
