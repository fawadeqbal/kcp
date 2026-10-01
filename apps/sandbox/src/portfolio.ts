/**
 * A child's public portfolio, on the user-content domain (this sandbox), not on the
 * main site: shared links point here, with the secret part after "#", which
 * browsers never send to any server or put in logs. The page reads the portfolio
 * from the API and shows each project in a sandboxed runner, like the editor does.
 */
import {
  type CodeFiles,
  isRunnerMessage,
  mountStage,
  parseProgram,
  type PythonManifest,
  type PythonRuntimeFiles,
  type StageLabels,
  type StageLevel,
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
  /** Block projects: the level their program plays on. */
  stage: StageLevel | null;
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

/** Interface icons (Lucide paths, as in packages/ui/src/icons.tsx), drawn in the text colour. */
const ICONS = {
  maximize: [
    'M8 3H5a2 2 0 0 0-2 2v3',
    'M21 8V5a2 2 0 0 0-2-2h-3',
    'M3 16v3a2 2 0 0 0 2 2h3',
    'M16 21h3a2 2 0 0 0 2-2v-3',
  ],
  minimize: [
    'M8 3v3a2 2 0 0 1-2 2H3',
    'M21 8h-3a2 2 0 0 1-2-2V3',
    'M3 16h3a2 2 0 0 1 2 2v3',
    'M16 21v-3a2 2 0 0 1 2-2h3',
  ],
};

function icon(name: keyof typeof ICONS) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [key, value] of Object.entries({
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2.75',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
  })) {
    svg.setAttribute(key, value);
  }
  for (const d of ICONS[name]) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

/**
 * A "Full screen" button for a project's card: it shows the whole card (name, details
 * and the running project) on the whole screen, and the button (or Esc) brings it back.
 * Where the browser has no full-screen mode (Safari on iPhone), the card covers the
 * window instead. The card is never moved, so a running program keeps running.
 */
function fullScreenButton(card: HTMLElement) {
  const button = element('button', { type: 'button', class: 'secondary' });
  let covering = false;
  const isFull = () => covering || document.fullscreenElement === card;
  const render = () => {
    const full = isFull();
    card.classList.toggle('is-full', full);
    document.documentElement.classList.toggle('covered', covering);
    button.replaceChildren(
      icon(full ? 'minimize' : 'maximize'),
      text(full ? 'exitFullScreen' : 'fullScreen'),
    );
  };
  button.addEventListener('click', async () => {
    if (isFull()) {
      if (document.fullscreenElement === card) await document.exitFullscreen().catch(() => {});
      covering = false;
    } else if (document.fullscreenEnabled && typeof card.requestFullscreen === 'function') {
      covering = await card.requestFullscreen().then(
        () => false,
        () => true,
      );
    } else {
      covering = true;
    }
    render();
  });
  document.addEventListener('fullscreenchange', render);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && covering) {
      covering = false;
      render();
    }
  });
  render();
  return button;
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

const STAGE_KEYS = [
  'stage',
  'score',
  'gems',
  'time',
  'says',
  'bumped',
  'collected',
  'nothingHere',
  'reachedGoal',
  'loop',
  'timeUp',
  'howToPlay',
  'up',
  'down',
  'left',
  'right',
] as const satisfies readonly (keyof StageLabels)[];

/** The stage's texts, raw: it fills in "{score}" and the like itself. */
const stageLabels = (): StageLabels =>
  Object.fromEntries(
    STAGE_KEYS.map((key) => [
      key,
      messages[`stage.${key}`] ?? PORTFOLIO_MESSAGES.en[`stage.${key}`] ?? key,
    ]),
  ) as unknown as StageLabels;

/**
 * A block project (Explorer): Bit's world, and a button that plays the program. The
 * program is data, played by the stage; no code from the project runs.
 */
function stageCard(card: HTMLElement, item: Item, stage: StageLevel) {
  const host = element('div', { class: 'stage' });
  const play = element('button', { type: 'button' }, text('play'));
  const stop = element('button', { type: 'button', class: 'secondary', hidden: '' }, text('stop'));
  const player = mountStage(host, stage, {
    labels: stageLabels(),
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  });
  play.addEventListener('click', () => {
    stop.hidden = false;
    void player.play(parseProgram(item.files.blocks) ?? []).then(() => {
      stop.hidden = true;
    });
  });
  stop.addEventListener('click', () => {
    player.stop();
    stop.hidden = true;
  });
  card.append(host, element('div', { class: 'actions' }, play, stop));
  return card;
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
  const card = element('article', { class: 'card' });
  card.append(
    element(
      'div',
      { class: 'card-head' },
      element(
        'div',
        {},
        element('h2', {}, item.title),
        element('p', { class: 'muted' }, `${item.moduleTitle} · ${text('shippedOn', { date })}`),
      ),
      fullScreenButton(card),
    ),
  );
  if (item.files.blocks !== undefined && item.stage) return stageCard(card, item, item.stage);
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
