import type { Check } from '@kcp/checks';
import { confirmResults, hasScript, isUnchanged, verifyStaticChecks } from './server-checks.js';

const CHECKS: Check[] = [
  { id: 'has-h1', expect: 'exists', selector: 'h1' },
  { id: 'h1-text', expect: 'text', selector: 'h1', includes: 'hello' },
  { id: 'img-alt', expect: 'attribute', selector: 'img', name: 'alt', notEmpty: true },
  { id: 'color', expect: 'css', selector: 'h1', property: 'color' },
  { id: 'test', expect: 'test', code: 'return true;' },
] as Check[];

describe('verifyStaticChecks', () => {
  it('checks HTML and CSS on the server, and leaves tests to the browser', async () => {
    const good = await verifyStaticChecks(
      {
        html: '<h1>Hello, world</h1><img src="https://example.com/cat.png" alt="A cat">',
        css: 'h1 { color: navy; }',
      },
      CHECKS,
    );
    expect(Object.fromEntries(good ?? [])).toEqual({
      'has-h1': true,
      'h1-text': true,
      'img-alt': true,
      color: true,
    });

    const empty = await verifyStaticChecks({ html: '', css: '' }, CHECKS);
    expect(Object.fromEntries(empty ?? [])).toEqual({
      'has-h1': false,
      'h1-text': false,
      'img-alt': false,
      color: false,
    });
  });

  it('leaves JavaScript lessons and Python programs to the browser', async () => {
    const script = { html: '', js: 'document.body.innerHTML = "<h1>hi</h1>"' };
    expect(await verifyStaticChecks(script, CHECKS, { scriptsMayChangePage: true })).toBeNull();
    expect(await verifyStaticChecks({ py: 'print(1)' }, CHECKS)).toBeNull();
    expect(await verifyStaticChecks({ html: '<h1>x</h1>' }, [CHECKS[4]!])).toBeNull();
  });

  it('judges HTML lessons and projects with scripts off, whatever the script does', async () => {
    const script = { html: '', js: 'document.body.innerHTML = "<h1>hello</h1>"' };
    expect((await verifyStaticChecks(script, CHECKS))?.get('has-h1')).toBe(false);
    // A JavaScript lesson whose script is only comments is judged too.
    const comments = { html: '<h1>hello</h1>', js: '// Optional: add a click.\n/* later */\n' };
    expect(
      (await verifyStaticChecks(comments, CHECKS, { scriptsMayChangePage: true }))?.get('has-h1'),
    ).toBe(true);
  });

  it('copes with pages too deeply nested to close', async () => {
    const deep = `${'<div>'.repeat(3900)}<h1>hello</h1>${'</div>'.repeat(3900)}`;
    const results = await verifyStaticChecks({ html: deep }, CHECKS.slice(0, 2));
    expect(results).not.toBeNull();
  });

  it('never runs scripts or loads anything', async () => {
    const results = await verifyStaticChecks(
      {
        html: '<script>document.body.innerHTML = "<h1>hello</h1>"</script><link rel="stylesheet" href="http://169.254.169.254/x.css"><iframe src="http://localhost:3000/"></iframe>',
      },
      CHECKS.slice(0, 1),
    );
    expect(results?.get('has-h1')).toBe(false);
  });
});

describe('confirmResults', () => {
  it('fails the HTML checks a hand-typed result claims, and keeps the rest', async () => {
    const warnings: string[] = [];
    const reported = new Map(CHECKS.map((check) => [check.id, true]));
    const confirmed = await confirmResults('c1', { html: '' }, CHECKS, reported, (m) =>
      warnings.push(m),
    );
    expect(confirmed.get('has-h1')).toBe(false);
    expect(confirmed.get('test')).toBe(true);
    expect(warnings).toHaveLength(4);
  });
});

describe('hasScript', () => {
  it('ignores comments and blank lines', () => {
    expect(hasScript(undefined)).toBe(false);
    expect(hasScript('// Optional: make it do something\n  \n/* a\n b */')).toBe(false);
    expect(hasScript("alert('hi') // say hello")).toBe(true);
    expect(hasScript("const url = 'https://example.com';")).toBe(true);
  });
});

describe('isUnchanged', () => {
  it('spots code that is still the starter', () => {
    expect(isUnchanged({ html: '<h1></h1>\n' }, { html: '<h1></h1>' })).toBe(true);
    expect(isUnchanged({ html: '<h1>Me</h1>' }, { html: '<h1></h1>' })).toBe(false);
    expect(isUnchanged({ html: '<h1></h1>', css: 'h1{}' }, { html: '<h1></h1>' })).toBe(false);
  });
});

/** A block program that moves Bit right `moves` times. */
const program = (moves: number) =>
  JSON.stringify([{ when: 'run', do: Array.from({ length: moves }, () => ({ move: 'right' })) }]);

describe('confirmResults for block programs', () => {
  const stage = {
    mode: 'maze' as const,
    map: ['#####', '#S.G#', '#####'],
    toolbox: ['when-run' as const, 'move' as const],
  };
  const checks = [
    { id: 'flag', expect: 'stage', atGoal: true },
    { id: 'few', expect: 'blocks', maxBlocks: 3 },
  ] as Check[];

  it('works the results out itself, whatever the browser reported', async () => {
    const warnings: string[] = [];
    const warn = (message: string) => warnings.push(message);
    const claimed = new Map([
      ['flag', true],
      ['few', true],
    ]);
    const short = await confirmResults('c', { blocks: program(1) }, checks, claimed, warn, {
      stage,
    });
    expect(Object.fromEntries(short)).toEqual({ flag: false, few: true });
    expect(warnings).toEqual(['Check c/flag passed in the browser but not on the server']);

    const solved = await confirmResults('c', { blocks: program(2) }, checks, new Map(), warn, {
      stage,
    });
    expect(Object.fromEntries(solved)).toEqual({ flag: true, few: true });
  });

  it('fails a block file sent where there is no stage', async () => {
    const results = await confirmResults(
      'c',
      { blocks: program(2) },
      checks,
      new Map([['flag', true]]),
      () => undefined,
    );
    expect(Object.fromEntries(results)).toEqual({ flag: false, few: false });
  });
});
