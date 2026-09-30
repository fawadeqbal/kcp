import { Window } from 'happy-dom';
import { composeDocument } from './compose.js';
import { allPassed, evaluateChecks, windowTestRunner } from './evaluate.js';
import type { Check, CodeFiles } from './types.js';

async function check(files: CodeFiles, checks: Check[]) {
  const window = new Window({ settings: { disableJavaScriptEvaluation: false } });
  // happy-dom doesn't run scripts added with document.write, so run the student's
  // JavaScript directly in the page (the browser sandbox runs it normally).
  window.document.write(composeDocument({ ...files, js: '' }));
  if (files.js) window.eval(files.js);
  await window.happyDOM.waitUntilComplete();
  const results = await evaluateChecks(
    window.document as unknown as Document,
    checks,
    windowTestRunner(window as unknown as globalThis.Window),
  );
  await window.happyDOM.close();
  return results;
}

const passed = async (files: CodeFiles, c: Check) => (await check(files, [c]))[0]?.passed;

describe('evaluateChecks', () => {
  it('finds elements, with minimum and maximum counts', async () => {
    const html = '<ul><li>a</li><li>b</li><li>c</li></ul>';
    expect(await passed({ html }, { id: 'x', expect: 'exists', selector: 'ul' })).toBe(true);
    expect(await passed({ html }, { id: 'x', expect: 'exists', selector: 'li', min: 3 })).toBe(
      true,
    );
    expect(await passed({ html }, { id: 'x', expect: 'exists', selector: 'li', min: 4 })).toBe(
      false,
    );
    expect(await passed({ html }, { id: 'x', expect: 'exists', selector: 'li', max: 2 })).toBe(
      false,
    );
    expect(await passed({ html }, { id: 'x', expect: 'exists', selector: 'ol' })).toBe(false);
  });

  it('checks text, ignoring case and extra spaces', async () => {
    const html = '<h1>  Hello   World </h1><p></p>';
    expect(
      await passed({ html }, { id: 'x', expect: 'text', selector: 'h1', includes: 'hello' }),
    ).toBe(true);
    expect(
      await passed({ html }, { id: 'x', expect: 'text', selector: 'h1', equals: 'hello world' }),
    ).toBe(true);
    expect(await passed({ html }, { id: 'x', expect: 'text', selector: 'p', notEmpty: true })).toBe(
      false,
    );
    expect(
      await passed(
        { html: '<li>a</li><li></li>' },
        { id: 'x', expect: 'text', selector: 'li', notEmpty: true, all: true },
      ),
    ).toBe(false);
    expect(
      await passed(
        { html: '<li>a</li><li></li>' },
        { id: 'x', expect: 'text', selector: 'li', notEmpty: true },
      ),
    ).toBe(true);
  });

  it('checks attributes', async () => {
    const html = '<a href="https://example.com">x</a><img src="a.png" alt="">';
    expect(
      await passed(
        { html },
        { id: 'x', expect: 'attribute', selector: 'a', name: 'href', includes: 'example' },
      ),
    ).toBe(true);
    expect(
      await passed(
        { html },
        { id: 'x', expect: 'attribute', selector: 'img', name: 'alt', notEmpty: true },
      ),
    ).toBe(false);
    expect(
      await passed({ html }, { id: 'x', expect: 'attribute', selector: 'img', name: 'title' }),
    ).toBe(false);
  });

  it('checks what the CSS says, including shorthands and media queries', async () => {
    const css =
      'body { background: #ffe; }\nh1, .title { color: tomato; }\n@media (max-width: 600px) { .card { padding: 8px; } }';
    const files = { html: '<h1>x</h1>', css };
    expect(await passed(files, { id: 'x', expect: 'css', selector: 'h1', property: 'color' })).toBe(
      true,
    );
    expect(
      await passed(files, {
        id: 'x',
        expect: 'css',
        selector: '.title',
        property: 'color',
        includes: 'tomato',
      }),
    ).toBe(true);
    expect(
      await passed(files, {
        id: 'x',
        expect: 'css',
        selector: 'body',
        property: 'background-color|background',
      }),
    ).toBe(true);
    expect(
      await passed(files, {
        id: 'x',
        expect: 'css',
        selector: '.card',
        property: 'padding',
        includes: 'px',
      }),
    ).toBe(true);
    expect(await passed(files, { id: 'x', expect: 'css', selector: 'p', property: 'color' })).toBe(
      false,
    );
  });

  it('runs JavaScript tests in the page', async () => {
    const files = {
      html: '<button id="b">Go</button><p id="out"></p>',
      js: 'document.getElementById("b").addEventListener("click", () => { document.getElementById("out").textContent = "Surprise!"; });',
    };
    const test: Check = {
      id: 't',
      expect: 'test',
      code: 'document.getElementById("b").click(); return document.getElementById("out").textContent.length > 0;',
    };
    expect(await passed(files, test)).toBe(true);
    expect(await passed({ html: files.html }, test)).toBe(false);
    expect(await passed(files, { id: 't', expect: 'test', code: 'throw new Error("no")' })).toBe(
      false,
    );
  });

  it('never throws on a broken check, and reports hints', async () => {
    const results = await check({ html: '<p>x</p>' }, [
      { id: 'bad', expect: 'exists', selector: '<<<', hint: 'fix_it' },
      { id: 'good', expect: 'exists', selector: 'p' },
    ]);
    expect(results).toEqual([
      { id: 'bad', passed: false, hint: 'fix_it' },
      { id: 'good', passed: true },
    ]);
    expect(allPassed(results)).toBe(false);
    expect(allPassed([])).toBe(false);
  });
});
