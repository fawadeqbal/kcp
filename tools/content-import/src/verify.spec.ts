import type { Check } from '@kcp/checks';
import type { LoadedTrack } from './load.js';
import { runChecks, verifyContent } from './verify.js';

/** Python checks run with Pyodide, like the browser sandbox does. */
describe('runChecks with Python', () => {
  const checks: Check[] = [
    { id: 'greets', expect: 'output', stdin: 'Sara', includes: 'hello sara' },
    { id: 'lines', expect: 'output', stdin: 'Sara', minLines: 2 },
    {
      id: 'fn',
      expect: 'python',
      stdin: 'Sara',
      code: 'assert double(3) == 6\nassert "input(" in __source__',
    },
  ];
  const program = [
    'name = input("Name? ")',
    'print("Hello", name)',
    'print("Bye")',
    'def double(x):',
    '    return x * 2',
  ].join('\n');

  it('passes a working program', async () => {
    const results = await runChecks({ py: program }, checks);
    expect(results.map((r) => r.passed)).toEqual([true, true, true]);
  }, 60_000);

  it('fails checks when the program is wrong or stops with an error', async () => {
    const wrong = await runChecks({ py: 'print("Hi")' }, checks);
    expect(wrong.map((r) => r.passed)).toEqual([false, false, false]);
    const broken = await runChecks({ py: `${program}\nprint(missing)` }, checks);
    expect(broken.every((r) => !r.passed)).toBe(true);
  }, 60_000);
});

/** The content rules that match how the API checks work (learning/server-checks.ts). */
describe('verifyContent', () => {
  const root = '/content';
  const trackWith = (project: Record<string, unknown>) =>
    [
      {
        dir: `${root}/t`,
        data: {},
        modules: [{ lessons: [], project: { file: `${root}/t/m/project.yaml`, data: project } }],
      },
    ] as unknown as LoadedTrack[];
  const checks = [{ id: 'has-h1', expect: 'exists', selector: 'h1' }];

  it('accepts work whose HTML meets the checks without its script', async () => {
    const issues = await verifyContent(
      trackWith({
        starter: { html: '', js: '' },
        solution: { html: '<h1>Hi</h1>', js: 'document.title = "x"' },
        checks,
      }),
      root,
    );
    expect(issues).toEqual([]);
  });

  it("refuses work that needs a script inside the HTML (the server doesn't run it)", async () => {
    const issues = await verifyContent(
      trackWith({
        starter: { html: '' },
        solution: { html: '<script>document.write("<h1>Hi</h1>")</script>' },
        checks,
      }),
      root,
    );
    expect(issues.map((issue) => issue.message).join('\n')).toContain('"has-h1"');
  });

  it('refuses work that only passes with its script running, or uses a file the editor lacks', async () => {
    const issues = await verifyContent(
      trackWith({
        starter: { html: '' },
        solution: { html: '', js: 'document.body.innerHTML = "<h1>Hi</h1>"' },
        checks,
      }),
      root,
    );
    expect(issues.map((issue) => issue.message)).toEqual([
      'the solution has a "js" file, but the starter (the editor\'s tabs) doesn\'t',
      'the solution only passes check "has-h1" with its script running (outside JavaScript lessons, the server checks HTML and CSS with scripts off)',
    ]);
  });
});
