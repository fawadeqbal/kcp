import { guardHtmlScripts, guardLoops } from './loop-guard.js';
import { installLoopGuard, LOOP_GUARD, LOOP_LIMIT_ERROR } from './runtime.js';

type Page = Record<string, () => void>;

function guarded(code: string) {
  const result = guardLoops(code);
  if (!result.ok) throw new Error(result.error.message);
  return result.code;
}

/** Runs guarded code with a real guard, like the preview page does; returns `out.value`. */
function run(code: string, limitMs = 50, page: Page = {}) {
  if (!page[LOOP_GUARD]) installLoopGuard(page, limitMs);
  const out: { value?: unknown } = {};
  new Function(LOOP_GUARD, 'out', guarded(code))(page[LOOP_GUARD], out);
  return out.value;
}

const nextTask = () => new Promise((resolve) => setTimeout(resolve, 5));

describe('loop guards', () => {
  it('guards every kind of loop, with or without braces', () => {
    const source = [
      'for (let i = 0; i < 3; i++) { a(); }',
      'for (const x of xs) b(x);',
      'for (const k in o) c(k);',
      'while (w) { d(); }',
      'do e(); while (f);',
      'for (;;);',
    ].join('\n');
    const result = guardLoops(source);
    expect(result.ok).toBe(true);
    const code = result.ok ? result.code : '';
    expect(code.split(`${LOOP_GUARD}();`)).toHaveLength(7);
    // Still valid JavaScript.
    expect(guardLoops(code).ok).toBe(true);
  });

  it('leaves finite loops working', () => {
    expect(run('let sum = 0; for (let i = 1; i <= 1000; i++) sum += i; out.value = sum;')).toBe(
      500500,
    );
    expect(run('let n = 0; while (n < 10) n++; out.value = n;')).toBe(10);
  });

  it('stops a loop that never ends', () => {
    const started = Date.now();
    expect(() => run('while (true) {}')).toThrow(LOOP_LIMIT_ERROR);
    expect(() => run('for (;;);')).toThrow(LOOP_LIMIT_ERROR);
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('gives every task a fresh budget, so animations keep running', async () => {
    const page: Page = {};
    installLoopGuard(page, 30);
    // Short loops, one per timer tick, together longer than the budget.
    const started = Date.now();
    let rounds = 0;
    while (Date.now() - started < 80) {
      expect(run('let n = 0; for (let i = 0; i < 100; i++) n++; out.value = n;', 30, page)).toBe(
        100,
      );
      rounds++;
      await nextTask();
    }
    expect(rounds).toBeGreaterThan(5);
  });

  it('keeps throwing until the task ends, even if the student catches the error', async () => {
    const page: Page = {};
    installLoopGuard(page, 30);
    expect(() => run('while (true) { try { while (true) {} } catch (e) {} }', 30, page)).toThrow(
      LOOP_LIMIT_ERROR,
    );
    expect(() => run('for (let i = 0; i < 2; i++) {}', 30, page)).toThrow(LOOP_LIMIT_ERROR);
    await nextTask();
    expect(run('let n = 0; for (let i = 0; i < 2; i++) n++; out.value = n;', 30, page)).toBe(2);
  });

  it('stops an endless loop of promise callbacks, which never lets a timer run', async () => {
    const page: Page = {};
    installLoopGuard(page, 30);
    const out: { value?: Promise<void> } = {};
    new Function(
      LOOP_GUARD,
      'out',
      guarded('out.value = (async () => { while (true) { await null; } })();'),
    )(page[LOOP_GUARD], out);
    await expect(out.value).rejects.toThrow(LOOP_LIMIT_ERROR);
  });

  it('reports syntax errors with their line instead of throwing', () => {
    const result = guardLoops('let a = 1;\nlet b = ;');
    expect(result).toEqual({
      ok: false,
      error: { kind: 'syntax', message: 'Unexpected token', line: 2 },
    });
  });

  it('does not touch loops inside strings or comments', () => {
    const result = guardLoops('// while (true) {}\nconst s = "for (;;) {}";');
    expect(result).toEqual({ ok: true, code: '// while (true) {}\nconst s = "for (;;) {}";' });
  });

  it('guards scripts written straight into the HTML', () => {
    const html = [
      '<h1>Hi</h1>',
      '<script>while (true) {}</script>',
      '<SCRIPT type="module">for (;;) {}</SCRIPT>',
      '<script src="app.js"></script>',
      '<script type="text/template">while (true) {}</script>',
      '<script>let broken = ;</script>',
    ].join('\n');
    expect(guardHtmlScripts(html)).toBe(
      [
        '<h1>Hi</h1>',
        `<script>while (true) {${LOOP_GUARD}();}</script>`,
        `<SCRIPT type="module">for (;;) {${LOOP_GUARD}();}</SCRIPT>`,
        '<script src="app.js"></script>',
        '<script type="text/template">while (true) {}</script>',
        '<script>let broken = ;</script>',
      ].join('\n'),
    );
  });
});
