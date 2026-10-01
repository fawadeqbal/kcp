/**
 * A hub milestone's preview, for the client: on the user-content domain (this
 * sandbox), with the secret part of the link after "#" (browsers never send it to any
 * server or put it in logs). The page reads the milestone's files from the API, builds
 * each page of the site into one self-contained document (preview-site.ts) and shows
 * it in a sandboxed frame (preview-frame.ts).
 */
import { element, fullScreenButton, type Language, pageLanguage, translator } from './page-kit.js';
import { PAGE_MESSAGE, Site, type SiteFile } from './preview-site.js';

/** Set at build time (scripts/build.mjs). */
declare const PREVIEW_API_URL: string;
declare const PREVIEW_MESSAGES: Record<Language, Record<string, string>>;

interface Preview {
  projectTitle: string;
  title: string;
  reference: string;
  submittedAt: string;
  files: SiteFile[];
}

const language = pageLanguage();
const text = translator(PREVIEW_MESSAGES, language);
const root = document.getElementById('app') as HTMLElement;
document.title = text('title');
/** The shown preview's listeners (a new link in the address bar shows another one). */
let shown: AbortController | null = null;

function message(key: string, tone: 'info' | 'error' = 'info') {
  root.replaceChildren(element('p', { class: `note ${tone}`, role: 'status' }, text(key)));
}

/** Text from the client's project stays in its own direction inside the page's. */
const isolate = (value: string) => element('bdi', {}, value);

function show(preview: Preview) {
  const site = new Site(preview.files);
  const pages = site.pages();
  document.title = `${preview.projectTitle} · ${text('title')}`;
  if (pages.length === 0) {
    message('noPages');
    return;
  }
  const date = new Intl.DateTimeFormat(language, { dateStyle: 'long' }).format(
    new Date(preview.submittedAt),
  );
  const parser = new DOMParser();
  let current = pages[0] ?? 'index.html';
  let ready = false;

  const frame = element('iframe', {
    sandbox: 'allow-scripts',
    src: '/preview-frame.html',
    title: text('frameTitle', { title: preview.projectTitle }),
  });
  const card = element('section', { class: 'card', 'aria-labelledby': 'preview-title' });
  const select = element('select', { id: 'preview-page' });
  for (const path of pages) {
    select.append(element('option', { value: path, dir: 'ltr' }, path));
  }

  const open = (path: string) => {
    if (!site.has(path)) return;
    current = path;
    select.value = path;
    const html = site.page(path, parser);
    if (ready && html !== null) {
      frame.contentWindow?.postMessage({ type: 'kcp:preview-show', html }, '*');
    }
  };
  select.addEventListener('change', () => open(select.value));
  shown?.abort();
  shown = new AbortController();
  window.addEventListener(
    'message',
    (event) => {
      if (event.source !== frame.contentWindow) return;
      const data = event.data as { type?: unknown; path?: unknown } | null;
      if (data?.type === 'kcp:preview-ready') {
        ready = true;
        open(current);
      } else if (data?.type === PAGE_MESSAGE && typeof data.path === 'string') {
        open(data.path);
      }
    },
    { signal: shown.signal },
  );

  const tools = element('div', { class: 'actions' });
  if (pages.length > 1) {
    tools.append(
      element(
        'span',
        { class: 'field' },
        element('label', { for: 'preview-page' }, text('page')),
        select,
      ),
    );
  }
  tools.append(fullScreenButton(card, { enter: text('fullScreen'), exit: text('exitFullScreen') }));
  card.append(
    element(
      'div',
      { class: 'card-head' },
      element(
        'div',
        {},
        element('p', { class: 'muted' }, `${preview.reference} · `, isolate(preview.title)),
        element('h1', { id: 'preview-title' }, isolate(preview.projectTitle)),
        element('p', { class: 'muted' }, text('sentOn', { date })),
      ),
    ),
    tools,
    frame,
  );
  root.replaceChildren(card, element('p', { class: 'note' }, text('note')));
}

async function main() {
  const token = location.hash.slice(1);
  if (!/^[\w-]{16,64}$/.test(token)) {
    message('notFound');
    return;
  }
  message('loading');
  let preview: Preview;
  try {
    const response = await fetch(
      `${PREVIEW_API_URL}/v1/shared/previews/${encodeURIComponent(token)}`,
      { credentials: 'omit', referrerPolicy: 'no-referrer' },
    );
    if (response.status === 404) {
      message('notFound');
      return;
    }
    if (!response.ok) throw new Error(String(response.status));
    preview = (await response.json()) as Preview;
  } catch {
    message('loadFailed', 'error');
    return;
  }
  show(preview);
}

void main();
window.addEventListener('hashchange', () => void main());
