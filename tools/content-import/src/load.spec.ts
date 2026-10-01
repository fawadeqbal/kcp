import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { hasBareHtml, loadContent, splitFrontMatter } from './load.js';
import { verifyContent } from './verify.js';

let root: string;

async function put(file: string, text: string) {
  const full = path.join(root, file);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, text);
}

const LESSON = 't/m01-x/l01-y';

async function writeValidContent() {
  await put('t/track.yaml', 'id: t\norder: 1\ntitles:\n  en: Track\n');
  await put(
    't/m01-x/module.yaml',
    'id: t-m01\norder: 1\ntitles:\n  en: M\ndescriptions:\n  en: D\n',
  );
  await put(`${LESSON}/lesson.yaml`, 'id: t-m01-l01\norder: 1\nxp: 10\n');
  await put(`${LESSON}/explain.en.md`, '---\ntitle: Hello\nsummary: S\n---\nUse `<h1>`.\n');
  await put(
    `${LESSON}/challenges/c1.yaml`,
    [
      'id: t-m01-l01-c1',
      'order: 1',
      'type: html',
      'xp: 5',
      'starter:',
      "  html: ''",
      'solution:',
      '  html: <h1>Hi</h1>',
      'checks:',
      '  - id: has-h1',
      '    expect: exists',
      '    selector: h1',
      '    hint: add_h1',
      '',
    ].join('\n'),
  );
  await put(
    `${LESSON}/challenges/c1.en.md`,
    '---\ntitle: Say hi\nhints:\n  add_h1: Use h1\nchecks:\n  has-h1: There is a heading\n---\nWrite a heading.\n',
  );
}

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'kcp-content-'));
  await writeValidContent();
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const errors = (issues: { level: string; message: string }[]) =>
  issues.filter((i) => i.level === 'error').map((i) => i.message);

describe('loadContent', () => {
  it('loads a valid content folder, warning about missing translations', async () => {
    const { tracks, issues } = await loadContent(root);
    expect(errors(issues)).toEqual([]);
    expect(issues.some((i) => i.message.includes('no ar explainer yet'))).toBe(true);
    const lesson = tracks[0]?.modules[0]?.lessons[0];
    expect(lesson?.data.id).toBe('t-m01-l01');
    expect(lesson?.texts['en']?.title).toBe('Hello');
    expect(lesson?.challenges[0]?.texts['en']?.hints).toEqual({ add_h1: 'Use h1' });
    expect(lesson?.challenges[0]?.texts['en']?.checkLabels).toEqual({
      'has-h1': 'There is a heading',
    });
  });

  it('needs an English label for every check, and only for real checks', async () => {
    await put(
      `${LESSON}/challenges/c1.en.md`,
      '---\ntitle: Say hi\nhints:\n  add_h1: Use h1\nchecks:\n  has-p: A paragraph\n---\nWrite a heading.\n',
    );
    await put(
      `${LESSON}/challenges/c1.ar.md`,
      '---\ntitle: قل مرحبًا\nhints:\n  add_h1: استخدم h1\n---\nاكتب عنوانًا.\n',
    );
    const { issues } = await loadContent(root);
    const messages = errors(issues);
    expect(messages).toContain('"checks" in c1.en.md names no check "has-p"');
    expect(messages).toContain('check "has-h1" has no label in c1.en.md ("checks")');
    expect(issues.some((i) => i.message.includes('no ar label — the English one is shown'))).toBe(
      true,
    );
  });

  it('reports broken files instead of throwing', async () => {
    await put(`${LESSON}/lesson.yaml`, 'id: t-m01-l01\norder: one\nxp: 10\n');
    const messages = errors((await loadContent(root)).issues).join('\n');
    expect(messages).toContain('order: Invalid input');
  });

  it('needs every hint a check uses, in English', async () => {
    await put(`${LESSON}/challenges/c1.en.md`, '---\ntitle: Say hi\n---\nWrite a heading.\n');
    const messages = errors((await loadContent(root)).issues).join('\n');
    expect(messages).toContain('hint "add_h1" is missing from c1.en.md');
  });

  it('checks IDs follow their parents and are unique', async () => {
    await writeValidContent();
    await put('t/m01-x/l02-z/lesson.yaml', 'id: t-m01-l01\norder: 2\nxp: 10\n');
    await put('t/m01-x/l02-z/explain.en.md', '---\ntitle: T\nsummary: S\n---\nBody\n');
    await put('t/m01-x/l03-w/lesson.yaml', 'id: wrong-l03\norder: 3\nxp: 10\n');
    await put('t/m01-x/l03-w/explain.en.md', '---\ntitle: T\nsummary: S\n---\nBody\n');
    const messages = errors((await loadContent(root)).issues).join('\n');
    expect(messages).toContain('id "t-m01-l01" is already used');
    expect(messages).toContain('id "wrong-l03" must start with "t-m01-"');
  });

  it('needs at least one challenge per lesson', async () => {
    await rm(path.join(root, LESSON, 'challenges'), { recursive: true });
    expect(errors((await loadContent(root)).issues)).toContain(
      'a lesson needs at least one challenge (a "try it" step)',
    );
  });

  it('requires English', async () => {
    await rm(path.join(root, LESSON, 'explain.en.md'));
    await put(`${LESSON}/explain.ar.md`, '---\ntitle: T\nsummary: S\n---\nBody\n');
    expect(errors((await loadContent(root)).issues)).toContain('needs explain.en.md');
  });
});

describe('module projects', () => {
  const PROJECT_YAML = [
    'id: t-m01-project',
    'xp: 50',
    'starter:',
    '  html: <h1>Me</h1>',
    '  css: ""',
    'solution:',
    '  html: <h1>Me</h1><p>Hi</p>',
    '  css: "h1 { color: red; }"',
    'checks:',
    '  - id: has-p',
    '    expect: exists',
    '    selector: p',
    '    hint: add_p',
    '',
  ].join('\n');

  it('warns when a module has no project yet', async () => {
    const { issues, tracks } = await loadContent(root);
    expect(tracks[0]?.modules[0]?.project).toBeNull();
    expect(issues.some((i) => i.message.includes('no project yet'))).toBe(true);
  });

  it('loads the project brief and proves it can be done', async () => {
    await put('t/m01-x/project.yaml', PROJECT_YAML);
    await put(
      't/m01-x/project.en.md',
      '---\ntitle: My page\nsummary: S\nhints:\n  add_p: Use p\nchecks:\n  has-p: A paragraph\n---\nBuild it.\n',
    );
    const { tracks, issues } = await loadContent(root);
    expect(errors(issues)).toEqual([]);
    const project = tracks[0]?.modules[0]?.project;
    expect(project?.data.xp).toBe(50);
    expect(project?.texts['en']).toEqual({
      title: 'My page',
      summary: 'S',
      hints: { add_p: 'Use p' },
      checkLabels: { 'has-p': 'A paragraph' },
      body: 'Build it.',
    });
    expect(errors(await verifyContent(tracks, root))).toEqual([]);
  });

  it('needs an English brief with every hint, and an ID under the module', async () => {
    await put('t/m01-x/project.yaml', PROJECT_YAML.replace('t-m01-project', 'other-project'));
    await put('t/m01-x/project.ar.md', '---\ntitle: T\nsummary: S\n---\nB\n');
    const messages = errors((await loadContent(root)).issues);
    expect(messages).toContain('id "other-project" must start with "t-m01-"');
    expect(messages).toContain('needs project.en.md');
  });
});

describe('verifyContent', () => {
  it('proves solutions pass and starters do not', async () => {
    const { tracks } = await loadContent(root);
    expect(errors(await verifyContent(tracks, root))).toEqual([]);
  });

  it('catches a wrong solution and a starter that already passes', async () => {
    await put(
      `${LESSON}/challenges/c1.yaml`,
      [
        'id: t-m01-l01-c1',
        'order: 1',
        'type: html',
        'xp: 5',
        'starter:',
        '  html: <h1>Already done</h1>',
        'solution:',
        '  html: <p>Oops</p>',
        'checks:',
        '  - id: has-h1',
        '    expect: exists',
        '    selector: h1',
        '    hint: add_h1',
        '  - id: bad',
        '    expect: exists',
        "    selector: 'h1 >'",
        '',
      ].join('\n'),
    );
    const { tracks } = await loadContent(root);
    const messages = errors(await verifyContent(tracks, root));
    expect(messages).toContain('the solution fails check "has-h1"');
    expect(messages).toContain('invalid CSS selector "h1 >"');
  });
});

/** A block challenge file: a two-square corridor, with these extra lines. */
const blockChallenge = (lines: string[]) =>
  [
    'id: t-m01-l01-c1',
    'order: 1',
    'type: blocks',
    'xp: 5',
    'stage:',
    '  mode: maze',
    '  map: ["#####", "#S.G#", "#####"]',
    '  toolbox: [when-run, move]',
    'starter:',
    '  blocks:',
    '    - when: run',
    '      do: []',
    ...lines,
    'checks:',
    '  - id: has-h1',
    '    expect: stage',
    '    atGoal: true',
    '    hint: add_h1',
    '',
  ].join('\n');

describe('block challenges (Explorer)', () => {
  it('loads a block program and proves the solution reaches the flag', async () => {
    await put(
      `${LESSON}/challenges/c1.yaml`,
      blockChallenge(['solution:', '  blocks:', '    - when: run', '      do: [{ move: right }]']),
    );
    const { tracks, issues } = await loadContent(root);
    expect(errors(issues)).toEqual([]);
    const challenge = tracks[0]?.modules[0]?.lessons[0]?.challenges[0]?.data;
    // Stored as the JSON the editor saves.
    expect(challenge?.starter.blocks).toBe('[{"when":"run","do":[]}]');
    // One step isn't enough: the flag is two squares away.
    expect(errors(await verifyContent(tracks, root))).toEqual([
      'the solution fails check "has-h1"',
    ]);
  });

  it('refuses unknown blocks, broken maps and web checks', async () => {
    await put(
      `${LESSON}/challenges/c1.yaml`,
      blockChallenge(['solution:', '  blocks:', '    - when: run', '      do: [{ jump: 3 }]'])
        .replace('"#S.G#"', '"#S.G"')
        .replace('expect: stage\n    atGoal: true', 'expect: exists\n    selector: h1'),
    );
    const messages = errors((await loadContent(root)).issues).join('\n');
    expect(messages).toMatch(/not a block program/);
    expect(messages).toMatch(/same length/);
    expect(messages).toMatch(/block programs "stage" and "blocks"/);
  });
});

describe('markdown helpers', () => {
  it('splits front matter', () => {
    expect(splitFrontMatter('---\ntitle: A\n---\n\nBody')).toEqual({
      front: { title: 'A' },
      body: 'Body',
    });
    expect(splitFrontMatter('No front matter')).toBeNull();
  });

  it('spots HTML outside code', () => {
    expect(hasBareHtml('Use `<h1>` here\n\n```html\n<p>x</p>\n```')).toBe(false);
    expect(hasBareHtml('Use <h1> here')).toBe(true);
  });
});

describe('skills', () => {
  const skills = [
    'skills:',
    '  - key: html',
    '    category: web',
    '    names:',
    '      en: Web pages',
    '      ar: صفحات الويب',
    '      ur: ویب صفحات',
    '',
  ].join('\n');

  it('reads skills.yaml and the skills lessons teach', async () => {
    await put('skills.yaml', skills);
    await put(`${LESSON}/lesson.yaml`, 'id: t-m01-l01\norder: 1\nxp: 10\nskills: [html]\n');
    const result = await loadContent(root);
    expect(errors(result.issues)).toEqual([]);
    expect(result.skills).toEqual([
      {
        key: 'html',
        category: 'web',
        names: { en: 'Web pages', ar: 'صفحات الويب', ur: 'ویب صفحات' },
      },
    ]);
    expect(result.tracks[0]!.modules[0]!.lessons[0]!.data.skills).toEqual(['html']);
  });

  it('refuses skills that are not in skills.yaml, or without it', async () => {
    await put(`${LESSON}/lesson.yaml`, 'id: t-m01-l01\norder: 1\nxp: 10\nskills: [loops]\n');
    expect(errors((await loadContent(root)).issues)).toContain(
      'lessons name skills, but there is no skills.yaml',
    );
    await put('skills.yaml', skills);
    expect(errors((await loadContent(root)).issues)).toContain(
      'unknown skill "loops" (not in skills.yaml)',
    );
    await put(
      'skills.yaml',
      `${skills}  - key: html\n    category: web\n    names:\n      en: Again\n`,
    );
    expect(errors((await loadContent(root)).issues).join()).toMatch(/skill "html" is listed twice/);
  });
});
