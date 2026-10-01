/**
 * The frame of the hub preview (preview-frame.html, with the runner's security
 * headers). The preview page embeds it with sandbox="allow-scripts" and sends it one
 * self-contained page of the client's site; it shows that page in a nested sandboxed
 * frame, and passes on clicks on links to the site's other pages. The site can run its
 * scripts and show its pictures, but can't call any server or reach this domain.
 */

const SHOW = 'kcp:preview-show';
const PAGE = 'kcp:preview-page';

let page: HTMLIFrameElement | null = null;

window.addEventListener('message', (event) => {
  const data = event.data as { type?: unknown; html?: unknown; path?: unknown } | null;
  if (event.source === window.parent) {
    if (data?.type !== SHOW || typeof data.html !== 'string') return;
    page?.remove();
    page = document.createElement('iframe');
    page.setAttribute('sandbox', 'allow-scripts');
    page.setAttribute('title', document.title);
    page.srcdoc = data.html;
    document.body.append(page);
    return;
  }
  if (page && event.source === page.contentWindow && data?.type === PAGE) {
    if (typeof data.path === 'string')
      window.parent.postMessage({ type: PAGE, path: data.path }, '*');
  }
});

window.parent.postMessage({ type: 'kcp:preview-ready' }, '*');
