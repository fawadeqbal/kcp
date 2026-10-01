/**
 * Small DOM helpers shared by the sandbox's own pages (the public portfolio and the
 * hub preview): building elements, interface icons, and a "Full screen" button.
 */

export function element<K extends keyof HTMLElementTagNameMap>(
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

export function icon(name: keyof typeof ICONS) {
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
 * A "Full screen" button for a card: it shows the whole card (name, details and the
 * running project) on the whole screen, and the button (or Esc) brings it back. Where
 * the browser has no full-screen mode (Safari on iPhone), the card covers the window
 * instead. The card is never moved, so a running program keeps running.
 */
export function fullScreenButton(card: HTMLElement, labels: { enter: string; exit: string }) {
  const button = element('button', { type: 'button', class: 'secondary' });
  let covering = false;
  const isFull = () => covering || document.fullscreenElement === card;
  const render = () => {
    const full = isFull();
    card.classList.toggle('is-full', full);
    document.documentElement.classList.toggle('covered', covering);
    button.replaceChildren(icon(full ? 'minimize' : 'maximize'), full ? labels.exit : labels.enter);
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

export type Language = 'en' | 'ar' | 'ur';

/** The page's language from ?lang (English otherwise), set on <html> with its direction. */
export function pageLanguage(): Language {
  const requested = new URLSearchParams(location.search).get('lang');
  const language: Language = requested === 'ar' || requested === 'ur' ? requested : 'en';
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'en' ? 'ltr' : 'rtl';
  return language;
}

/** A text lookup with {placeholders}, falling back to English, then to the key. */
export function translator(all: Record<Language, Record<string, string>>, language: Language) {
  const messages = all[language];
  return (key: string, values: Record<string, string> = {}) =>
    (messages[key] ?? all.en[key] ?? key).replace(
      /\{(\w+)\}/g,
      (_, name: string) => values[name] ?? '',
    );
}
