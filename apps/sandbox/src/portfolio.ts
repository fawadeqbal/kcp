/**
 * A child's public portfolio, on the user-content domain (this sandbox), not on the
 * main site: shared links point here, with the secret part after "#", which
 * browsers never send to any server or put in logs. The page reads the portfolio
 * from the API and shows each project in a sandboxed runner, like the editor does.
 */
import {
  type CodeFiles,
  isRunnerMessage,
  type PythonManifest,
  type PythonRuntimeFiles,
} from '@kcp/checks';

/** Set at build time (scripts/build.mjs). */
declare const PORTFOLIO_API_URL: string;
declare const PORTFOLIO_WEB_URL: string;
declare const PORTFOLIO_MESSAGES: Record<'en' | 'ar' | 'ur', Record<string, string>>;

interface Item {
  id: string;
  title: string;
  moduleTitle: string;
  version: number;
  publishedAt: string;
  files: CodeFiles;
}

interface Portfolio {
  nickname: string;
  avatarKey: string;
  items: Item[];
}

type Language = 'en' | 'ar' | 'ur';
const params = new URLSearchParams(location.search);
const requested = params.get('lang');
const language: Language = requested === 'ar' || requested === 'ur' ? requested : 'en';
const messages = PORTFOLIO_MESSAGES[language];
const text = (key: string, values: Record<string, string> = {}) =>
  (messages[key] ?? PORTFOLIO_MESSAGES.en[key] ?? key).replace(
    /\{(\w+)\}/g,
    (_, name: string) => values[name] ?? '',
  );

const root = document.getElementById('app') as HTMLElement;
document.documentElement.lang = language;
document.documentElement.dir = language === 'en' ? 'ltr' : 'rtl';

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Record<string, string> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  node.append(...children);
  return node;
}

/** Latin nicknames stay left-to-right inside Arabic and Urdu sentences. */
const isolate = (value: string) => element('bdi', {}, value);

function message(key: string, tone: 'info' | 'error' = 'info') {
  root.replaceChildren(element('p', { class: `note ${tone}`, role: 'status' }, text(key)));
}

// ── Python (downloaded from this same site only when a Python project runs) ──

let python: Promise<{ version: string; files: PythonRuntimeFiles }> | null = null;

function loadPython() {
  python ??= (async () => {
    const manifest = (await (await fetch('/pyodide/manifest.json')).json()) as PythonManifest;
    const entries = await Promise.all(
      (Object.keys(manifest.files) as (keyof PythonRuntimeFiles)[]).map(async (key) => {
        const response = await fetch(`/${manifest.files[key].path}`);
        if (!response.ok) throw new Error(`Python: ${response.status}`);
        return [key, await response.blob()] as const;
      }),
    );
    return {
      version: manifest.version,
      files: Object.fromEntries(entries) as unknown as PythonRuntimeFiles,
    };
  })();
  return python;
}

/** One project, running in its own sandboxed runner. */
function projectCard(item: Item) {
  const date = new Intl.DateTimeFormat(language, { dateStyle: 'long' }).format(
    new Date(item.publishedAt),
  );
  const isPython = item.files.py !== undefined;
  const frame = element('iframe', {
    sandbox: 'allow-scripts',
    title: text('previewTitle', { title: item.title }),
    loading: 'lazy',
    src: '/',
  });
  const card = element(
    'article',
    { class: 'card' },
    element('h2', {}, item.title),
    element('p', { class: 'muted' }, `${item.moduleTitle} · ${text('shippedOn', { date })}`),
  );
  let ready = false;
  let pending: { stdin: string } | null = isPython ? null : { stdin: '' };
  const run = (stdin: string) => {
    frame.contentWindow?.postMessage(
      { type: 'kcp:run', runId: crypto.randomUUID(), files: item.files, checks: null, stdin },
      '*',
    );
  };
  window.addEventListener('message', (event) => {
    if (event.source !== frame.contentWindow || !isRunnerMessage(event.data)) return;
    if (event.data.type === 'kcp:ready') {
      ready = true;
      void (async () => {
        if (isPython) {
          const runtime = await loadPython();
          frame.contentWindow?.postMessage({ type: 'kcp:python-runtime', ...runtime }, '*');
        }
        if (pending) run(pending.stdin);
      })();
    }
  });

  if (isPython) {
    const code = element('pre', { class: 'code', dir: 'ltr' }, item.files.py ?? '');
    const stdin = element('textarea', { id: `stdin-${item.id}`, rows: '2', dir: 'auto' });
    const button = element('button', { type: 'button' }, text('run'));
    button.addEventListener('click', () => {
      pending = { stdin: stdin.value };
      frame.hidden = false;
      if (ready) {
        void loadPython().then((runtime) => {
          frame.contentWindow?.postMessage({ type: 'kcp:python-runtime', ...runtime }, '*');
          run(stdin.value);
        });
      }
    });
    frame.hidden = true;
    card.append(
      code,
      element('label', { for: `stdin-${item.id}` }, text('pythonInput')),
      stdin,
      button,
    );
  }
  card.append(frame);
  return card;
}

async function main() {
  const token = location.hash.slice(1);
  if (!/^[\w-]{16,64}$/.test(token)) {
    message('notFound');
    return;
  }
  message('loading');
  let portfolio: Portfolio;
  try {
    const response = await fetch(
      `${PORTFOLIO_API_URL}/v1/shared/portfolios/${encodeURIComponent(token)}?lang=${language}`,
      { credentials: 'omit', referrerPolicy: 'no-referrer' },
    );
    if (response.status === 404) {
      message('notFound');
      return;
    }
    if (!response.ok) throw new Error(String(response.status));
    portfolio = (await response.json()) as Portfolio;
  } catch {
    message('loadFailed', 'error');
    return;
  }
  document.title = text('heading', { nickname: portfolio.nickname });
  const heading = element('h1', {});
  const [before, after = ''] = text('heading', { nickname: '\u0000' }).split('\u0000');
  heading.append(before ?? '', isolate(portfolio.nickname), after);
  root.replaceChildren(
    element(
      'header',
      {},
      element('span', { class: 'avatar', 'aria-hidden': 'true' }, portfolio.nickname.slice(0, 1)),
      element('div', {}, heading, element('p', { class: 'muted' }, text('intro'))),
    ),
    ...(portfolio.items.length
      ? portfolio.items.map(projectCard)
      : [element('p', { class: 'note' }, text('empty'))]),
    element(
      'footer',
      {},
      element('a', { href: PORTFOLIO_WEB_URL, rel: 'noopener' }, text('madeOn')),
    ),
  );
}

void main();
window.addEventListener('hashchange', () => void main());
