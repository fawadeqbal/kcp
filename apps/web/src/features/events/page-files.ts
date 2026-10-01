/** <link> and <script> tags for the page's own style.css and script.js (any ./ or /). */
const OWN_STYLESHEET = /<link\b[^>]*\bhref\s*=\s*(["']?)(?:\.?\/)?style\.css\1[^>]*>/gi;
const OWN_SCRIPT =
  /<script\b[^>]*\bsrc\s*=\s*(["']?)(?:\.?\/)?script\.js\1[^>]*>\s*<\/script\s*>/gi;

/**
 * The files a team page is made of, for the preview. The preview puts style.css and
 * script.js into the page itself, so the page's own tags for them go (in the sandbox
 * they would ask for files that aren't there, or run the script twice).
 */
export function pageFiles(files: Record<string, string>) {
  return {
    html: (files['index.html'] ?? '').replace(OWN_STYLESHEET, '').replace(OWN_SCRIPT, ''),
    css: files['style.css'] ?? '',
    js: files['script.js'] ?? '',
  };
}
