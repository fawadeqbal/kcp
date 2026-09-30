import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Locale } from '@kcp/i18n';
import { parse } from 'yaml';
import { expect, test } from './fixtures';
import { createStudent, logInAsStudent, MESSAGES } from './helpers';

/** Lesson 1's quizzes, straight from content/. */
const DIR = path.resolve(
  import.meta.dirname,
  '../../../content/builder/m01-first-website/l01-hello-html/quizzes',
);
interface QuizFile {
  prompt: Record<string, string>;
  code: string[];
  explanation: Record<string, string>;
  options?: { id: string; text: Record<string, string> }[];
  answer?: string;
  bugLine?: number;
}
const quiz = (name: string) => parse(readFileSync(path.join(DIR, name), 'utf8')) as QuizFile;
const ORDER = quiz('q1.yaml');
const BUG = quiz('q2.yaml');
const CHOICE = quiz('q3.yaml');

const fill = (template: string, values: Record<string, string | number>) =>
  template.replaceAll(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));

for (const locale of ['en', 'ar'] as const satisfies Locale[]) {
  test(`a student answers a lesson's quick questions (${locale})`, async ({ page, request }) => {
    const m = MESSAGES[locale].lesson.quiz;
    const student = await createStudent(request, { locale });
    await logInAsStudent(page, locale, student.username);
    await page.goto(`/${locale}/learn/builder-m01-l01`);
    // The questions are the last stop on the lesson's stepper.
    await page.getByRole('tab', { name: m.title }).click();

    const section = page.getByRole('region', { name: m.title });
    await expect(section).toBeVisible();
    const forms = section.locator('form');
    await expect(forms).toHaveCount(3);

    // Put the lines in order with the arrow buttons; the server grades it.
    const order = forms.nth(0);
    await expect(order.getByText(ORDER.prompt[locale]!)).toBeVisible();
    const lines = order.locator('ol li code');
    for (let target = 0; target < ORDER.code.length; target++) {
      const texts = (await lines.allTextContents()).map((t) => t.trimEnd());
      let from = texts.indexOf(ORDER.code[target]!.trimEnd());
      while (from > target) {
        await order.getByRole('button', { name: fill(m.moveUp, { number: from + 1 }) }).click();
        from--;
      }
    }
    await order.getByRole('button', { name: m.check }).click();
    await expect(order.getByText(fill(m.correctXp, { xp: 5 }))).toBeVisible();
    await expect(order.getByText(ORDER.explanation[locale]!)).toBeVisible();

    // The wrong line twice: the right answer and why are shown.
    const bug = forms.nth(1);
    for (let i = 0; i < 2; i++) {
      await bug.getByRole('radio', { name: fill(m.line, { number: 1 }) }).check();
      await bug.getByRole('button', { name: m.check }).click();
      await expect(bug.getByText(i === 0 ? m.wrong : m.revealed)).toBeVisible();
    }
    await expect(
      bug.getByRole('radio', { name: fill(m.line, { number: BUG.bugLine! }) }),
    ).toBeChecked();
    await expect(bug.getByText(BUG.explanation[locale]!)).toBeVisible();

    // A choice, in the student's language.
    const choice = forms.nth(2);
    const right = CHOICE.options!.find((o) => o.id === CHOICE.answer)!;
    await choice.getByRole('radio', { name: right.text[locale] }).check();
    await choice.getByRole('button', { name: m.check }).click();
    await expect(choice.getByText(fill(m.correctXp, { xp: 5 }))).toBeVisible();

    // Answered quizzes show as done after a reload.
    await page.reload();
    await page.getByRole('tab', { name: m.title }).click();
    await expect(section.getByText(m.solved)).toHaveCount(2);
  });
}
