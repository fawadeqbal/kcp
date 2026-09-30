import type { CodeFiles } from './types.js';

/**
 * Stops the student's text from ending our <script> or <style> element early.
 * (Only the closing tag matters; everything else is left exactly as typed.)
 */
function escapeClosingTag(code: string, tag: 'script' | 'style'): string {
  return code.replace(new RegExp(`</(${tag})`, 'gi'), '<\\/$1');
}

export interface ComposeOptions {
  /** Inline script placed first in <head>, before any student code (the sandbox agent). */
  headScript?: string;
  /** Replaces files.js, e.g. with loop guards added. */
  js?: string;
}

/**
 * Builds the page the student sees: their HTML, with their CSS in a <style> element
 * and their JavaScript in a <script> at the end of <body>. Works whether the HTML is
 * a full document or just a few tags.
 */
export function composeDocument(files: CodeFiles, options: ComposeOptions = {}): string {
  const html = files.html ?? '';
  const css = files.css?.trim() ? `<style>\n${escapeClosingTag(files.css, 'style')}\n</style>` : '';
  const jsSource = options.js ?? files.js ?? '';
  const js = jsSource.trim() ? `<script>\n${escapeClosingTag(jsSource, 'script')}\n</script>` : '';
  const head = options.headScript
    ? `<script>${escapeClosingTag(options.headScript, 'script')}</script>`
    : '';

  const isFullDocument = /<html[\s>]/i.test(html) || /<body[\s>]/i.test(html);
  if (!isFullDocument) {
    return [
      '<!doctype html>',
      '<html>',
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      head,
      css,
      '</head>',
      '<body>',
      html,
      js,
      '</body>',
      '</html>',
    ]
      .filter(Boolean)
      .join('\n');
  }

  // Replacement functions (not strings), so a "$1" in the student's code stays as typed.
  let page = html;
  // Our script must run before anything the student wrote, including their <head>.
  if (head) {
    if (/<head(?:\s[^>]*)?>/i.test(page)) {
      page = page.replace(/<head(?:\s[^>]*)?>/i, (tag) => `${tag}\n${head}`);
    } else if (/<html(?:\s[^>]*)?>/i.test(page)) {
      page = page.replace(/<html(?:\s[^>]*)?>/i, (tag) => `${tag}\n<head>${head}</head>`);
    } else {
      page = `${head}\n${page}`;
    }
  }
  if (css) {
    page = /<\/head>/i.test(page)
      ? page.replace(/<\/head>/i, () => `${css}\n</head>`)
      : `${css}\n${page}`;
  }
  if (js) {
    const lastBody = page.search(/<\/body>(?![\s\S]*<\/body>)/i);
    page =
      lastBody >= 0 ? `${page.slice(0, lastBody)}${js}\n${page.slice(lastBody)}` : `${page}\n${js}`;
  }
  return page;
}
