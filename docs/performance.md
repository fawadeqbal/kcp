# Performance

Families use mid-range Android phones and slow or metered connections, so the web app is kept small and the heavy parts load only when needed. The budgets below are checked by browser tests (`apps/web/e2e/performance.spec.ts`) on every CI run; raise one only on purpose, in the change that needs it.

## JavaScript budgets

Compressed JavaScript a first visit downloads from the web app (nothing cached), measured 30 September 2026:

| Page                           | Budget |    Now |
| ------------------------------ | -----: | -----: |
| Home                           | 200 KB | 166 KB |
| Student login                  | 200 KB | 166 KB |
| Student login, then lesson map | 430 KB | 371 KB |
| A lesson (editor and preview)  | 280 KB | 237 KB |

Most of it is React and Next.js, shared by every page and cached after the first visit. The lesson page adds CodeMirror. Next.js splits the rest per page.

## Slow 3G on a mid-range phone

The test simulates "slow 3G" (400 ms per response, about 50 KB/s shared) and a processor four times slower than the laptop. The student login page must be **usable within 10 seconds**, meaning its buttons respond (the "Show password" toggle works). Today: **6.0 seconds**.

The test measures time in a shared CI machine, so a slow run can fail it; CI retries a failing browser test once. If it fails twice, check what was added to the login page before raising the limit.

## Heavy parts load only when needed

- **Python (Pyodide, about 13 MB)** downloads only on Python lessons, with a progress bar. The files are versioned and cached for a year, so later visits start from the cache.
- **Lesson videos** are embedded from YouTube (the privacy-enhanced `youtube-nocookie.com`) or Cloudflare Stream. Both stream adaptively, picking a lower quality on slow connections, and the player loads lazily (`loading="lazy"`). A lesson works without its video: the explainer and "try it" steps are text.
- **Fonts:** Noto Sans Arabic and Noto Nastaliq Urdu are only named in the Arabic and Urdu styles, so browsers download them only on pages in those languages.
- **The code sandbox** is a few small static files on its own domain, cached by the browser.

## API speed

See [the load test](load-test.md): with 1,000 students working at once, 99% of requests answer within 120 ms on one small API instance.

## Checking by hand

On a real mid-range phone (or Chrome DevTools: Network "Slow 3G", CPU "4× slowdown"), before the pilot and after big changes to the lesson page:

1. Open the student login page with an empty cache; log in; open a lesson. Nothing should feel stuck for more than a few seconds, and there should be a loading state wherever a wait is longer.
2. Type in the editor and press "Check my code": the editor must keep up with typing.
3. Open a Python lesson on the slow connection: the progress bar moves, and the rest of the page stays usable while Python downloads.
