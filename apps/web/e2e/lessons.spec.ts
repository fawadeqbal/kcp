import type { CodeFileKey, CodeFiles } from '@kcp/checks';
import { directionOf, type Locale } from '@kcp/i18n';
import { type Locator, type Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { loadModule, loadProject } from './content';
import { checkFullScreen } from './full-screen';
import {
  API_URL,
  createStudent,
  logInAsStudent,
  MESSAGES,
  type Messages,
  celebrate,
} from './helpers';

/** Module 1 of the Builder track, straight from content/. */
const MODULE = loadModule('builder/m01-first-website');
/** Every lesson on the home page (Module 1, then Python). */
const ALL_LESSONS =
  MODULE.length +
  loadModule('builder/m02-python-first-steps').length +
  loadModule('explorer/m01-meet-bit').length +
  loadModule('pro/m01-git-teamwork').length;
const PROJECT_ID = loadProject('builder/m01-first-website').id;
const FILE_TABS = {
  html: 'fileHtml',
  css: 'fileCss',
  js: 'fileJs',
  py: 'filePy',
  blocks: 'fileBlocks',
  git: 'fileGit',
} as const;

const fill = (template: string, values: Record<string, string | number>) =>
  template.replaceAll(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));

/** One lesson screen, driven the way a student would, by mouse or by touch. */
class LessonScreen {
  constructor(
    private readonly page: Page,
    private readonly m: Messages,
    private readonly touch: boolean,
  ) {}

  press(target: Locator) {
    return this.touch ? target.tap() : target.click();
  }

  editor(file: CodeFileKey) {
    const label = fill(this.m.lesson.editorLabel, { file: this.m.lesson[FILE_TABS[file]] });
    return this.page.getByRole('textbox', { name: label });
  }

  async openFile(file: CodeFileKey) {
    await this.press(
      this.page.getByRole('tab', { name: this.m.lesson[FILE_TABS[file]], exact: true }),
    );
    return this.editor(file);
  }

  /** Replaces a file's code, like pasting it in. */
  async paste(file: CodeFileKey, code: string) {
    const editor = await this.openFile(file);
    await this.press(editor);
    await this.page.keyboard.press('ControlOrMeta+a');
    await this.page.keyboard.insertText(code);
  }

  /** Writes the files that differ from the starter code. */
  async solve(solution: CodeFiles, starter: CodeFiles) {
    for (const [file, code] of Object.entries(solution) as [CodeFileKey, string][]) {
      if (code !== starter[file]) await this.paste(file, code);
    }
  }

  async check() {
    await this.press(this.page.getByRole('button', { name: this.m.lesson.check }));
  }

  passed() {
    return expect(this.page.getByText(this.m.lesson.allPassed)).toBeVisible();
  }
}

for (const locale of ['en', 'ar'] as const satisfies Locale[]) {
  test(`a student finishes Module 1, lessons 1–5 (${locale})`, async ({ page, request }, info) => {
    test.setTimeout(240_000);
    const m = MESSAGES[locale];
    const device = info.project.name;
    const screen = new LessonScreen(page, m, info.project.use.hasTouch === true);
    const student = await createStudent(request, { locale });
    await logInAsStudent(page, locale, student.username);

    // The home page lists the module and points at the first lesson.
    await expect(
      page.getByText(fill(m.learn.progress, { done: 0, total: ALL_LESSONS })),
    ).toBeVisible();
    await screen.press(page.getByRole('link', { name: m.learn.startFirst }));

    for (const [lessonIndex, lesson] of MODULE.entries()) {
      await expect(page).toHaveURL(new RegExp(`/${locale}/learn/${lesson.id}$`));
      await expect(
        page.getByText(fill(m.lesson.lessonOf, { number: lessonIndex + 1, total: MODULE.length })),
      ).toBeVisible();

      // A new lesson opens on its introduction; "Let's try it" starts the steps.
      await screen.press(page.getByRole('button', { name: m.lesson.startSteps }));

      for (const [step, challenge] of lesson.challenges.entries()) {
        const hints = { ...challenge.hints['en'], ...challenge.hints[locale] };
        if (step > 0) {
          await screen.press(page.getByRole('button', { name: m.lesson.nextStep }));
          // Focus moves to the new step's title, for keyboard and screen reader users.
          await expect(page.locator('#lesson-step-panel h3')).toBeFocused();
        }

        if (lessonIndex === 0 && step === 0) {
          // An empty page fails, with hints in the student's language.
          await screen.check();
          await expect(
            page.getByText(fill(m.lesson.someFailed, { passed: 0, total: 2 })),
          ).toBeVisible();
          await expect(page.getByText(hints['add_h1'] ?? '', { exact: true })).toBeVisible();
          // Typing, key by key: the editor closes the tag, and code stays left-to-right.
          const editor = screen.editor('html');
          await screen.press(editor);
          await page.keyboard.type('<h1>Hi');
          await expect(editor).toHaveText('<h1>Hi</h1>');
          await expect(page.getByTestId('editor-html')).toHaveAttribute('dir', 'ltr');
          await screen.check();
          await screen.passed();
          await celebrate(page, m, ['first-steps']);
          continue;
        }

        if (lessonIndex === 0 && step === 1) {
          // Code is saved as the student types, and is still there after a reload.
          await screen.paste('html', '<h1>Welcome, draft<h1>');
          await expect(page.getByText(m.lesson.saved)).toBeVisible();
          await page.reload();
          await expect(
            page.getByRole('tab', { name: fill(m.lesson.step, { number: 2 }), selected: true }),
          ).toBeVisible();
          await expect(screen.editor('html')).toContainText('Welcome, draft');
          // "Start again" brings back the starter code, which still has the mistake.
          await screen.press(page.getByRole('button', { name: m.lesson.reset }));
          await screen.press(
            page.getByRole('dialog').getByRole('button', { name: m.lesson.resetConfirm }),
          );
          await expect(screen.editor('html')).toHaveText(challenge.starter.html?.trim() ?? '');
          await screen.check();
          await expect(page.getByText(hints['closing_slash'] ?? '', { exact: true })).toBeVisible();
        }

        await screen.solve(challenge.solution, challenge.starter);
        await screen.check();
        await screen.passed();
        // Badges celebrate the first lesson, then the fifth and the whole module.
        if (step === lesson.challenges.length - 1) {
          if (lessonIndex === 0) await celebrate(page, m, ['first-lesson']);
          if (lessonIndex === 4) await celebrate(page, m, ['five-lessons', 'web-builder']);
        }
        if (lessonIndex === 2 && step === 1) {
          await page.screenshot({
            path: `test-results/screens/lesson-${locale}-${device}.png`,
            fullPage: true,
          });
        }
      }

      const complete = page.getByRole('heading', { name: m.lesson.lessonComplete });
      await expect(complete).toBeVisible();
      await expect(complete).toBeFocused();
      if (lessonIndex === 0) {
        // Back to step 1 with the arrow keys (mirrored in Arabic): the student's code is there.
        await page.getByRole('tab', { name: fill(m.lesson.stepDone, { number: 2 }) }).focus();
        await page.keyboard.press(directionOf(locale) === 'rtl' ? 'ArrowRight' : 'ArrowLeft');
        await expect(
          page.getByRole('tab', { name: fill(m.lesson.stepDone, { number: 1 }), selected: true }),
        ).toBeFocused();
        await expect(screen.editor('html')).toHaveText('<h1>Hi</h1>');
      }
      if (lessonIndex < MODULE.length - 1) {
        await screen.press(page.getByRole('link', { name: m.lesson.nextLesson }).first());
      }
    }

    // Back home: everything is done, and the page is laid out for the language.
    await screen.press(page.getByRole('link', { name: m.lesson.backToMap }).last());
    await expect(page).toHaveURL(new RegExp(`/${locale}/learn$`));
    // With every lesson done, the home page points at the module project next.
    await expect(page.getByRole('link', { name: m.project.start, exact: true })).toHaveAttribute(
      'href',
      `/${locale}/learn/projects/${PROJECT_ID}`,
    );
    await expect(
      page.getByText(fill(m.learn.progress, { done: MODULE.length, total: ALL_LESSONS })),
    ).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('dir', directionOf(locale));
    await page.screenshot({
      path: `test-results/screens/learn-done-${locale}-${device}.png`,
      fullPage: true,
    });

    // The parent sees the progress on their dashboard.
    const children = await request.get(`${API_URL}/v1/children`, {
      headers: { Authorization: `Bearer ${student.parentToken}` },
    });
    const [child] = (await children.json()) as { lessonsCompleted: number }[];
    expect(child?.lessonsCompleted).toBe(MODULE.length);
  });
}

test('the editor and the preview fit on the screen, and the preview opens full screen', async ({
  page,
  request,
}, info) => {
  const m = MESSAGES.en;
  const touch = info.project.use.hasTouch === true;
  const screen = new LessonScreen(page, m, touch);
  const student = await createStudent(request, { locale: 'en' });
  await logInAsStudent(page, 'en', student.username);
  await page.goto(`/en/learn/${MODULE[0]!.id}`);
  await screen.press(page.getByRole('button', { name: m.lesson.startSteps }));

  // Far more code than fits on the screen.
  const lines = Array.from({ length: 150 }, (_, i) => `<p>Line ${i + 1}</p>`);
  await screen.paste('html', lines.join('\n'));
  const { height } = await page.evaluate(() => ({ height: window.innerHeight }));
  const editor = page.getByTestId('editor-html');
  const preview = page.getByTitle(m.lesson.previewTitle, { exact: true });
  await expect(preview).toBeVisible();

  // The editor and the preview are never taller than the screen: they scroll inside.
  expect((await editor.boundingBox())!.height).toBeLessThanOrEqual(height);
  expect((await preview.boundingBox())!.height).toBeLessThanOrEqual(height);
  expect(
    await editor.locator('.cm-scroller').evaluate((node) => node.scrollHeight > node.clientHeight),
  ).toBe(true);
  // The last line is reached by scrolling the editor, not the page.
  await editor.locator('.cm-scroller').evaluate((node) => node.scrollTo(0, node.scrollHeight));
  await expect(editor.locator('.cm-line', { hasText: 'Line 150<' })).toBeInViewport();
  if (!touch) {
    // On a laptop the whole workspace fits on one screen.
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(
      height,
    );
  }

  await checkFullScreen(page, {
    scope: page.getByRole('main'),
    frame: preview,
    enter: m.lesson.fullScreen,
    exit: m.lesson.exitFullScreen,
    press: (target) => screen.press(target),
  });
});
