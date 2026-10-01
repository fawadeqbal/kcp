import { expect, test } from './fixtures';
import { query, removeLessonTranslation } from './database';
import { createStaff, firstLogin } from './helpers';

const LESSON = 'builder-m01-l01';

test.afterEach(async () => {
  await removeLessonTranslation(LESSON, 'fr');
});

test('a tutor translates a lesson, and a second tutor reviews and publishes it', async ({
  page,
  browser,
}) => {
  const writer = createStaff('content_creator');
  const reviewer = createStaff('content_creator');

  // A content creator starts on Content (no account data for them).
  await firstLogin(page, writer, 'Content');
  await page
    .getByRole('row', { name: /Your first website/ })
    .getByRole('link', { name: 'Translate' })
    .click();
  await expect(page.getByRole('heading', { name: 'Translate: Your first website' })).toBeVisible();
  await page.getByLabel('Translate into').selectOption('fr');
  await expect(page).toHaveURL(/\?lang=fr$/);
  await page
    .getByRole('row', { name: /What is a website/ })
    .getByRole('link', { name: 'Translate' })
    .click();

  // English on one side, French on the other.
  await expect(page.getByRole('heading', { name: 'English (live)' })).toBeVisible();
  await page.getByLabel('Title').fill('Qu’est-ce qu’un site web ?');
  await page.getByLabel('Summary').fill('Les pages web sont écrites en HTML.');
  await page.getByLabel('Text (Markdown)').fill('Chaque site est fait de **pages web**.');
  await page.getByRole('button', { name: 'Preview as students see it' }).click();
  await expect(page.locator('strong', { hasText: 'pages web' })).toBeVisible();
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText('Draft saved. Students still read the live text.')).toBeVisible();
  await page.getByRole('button', { name: 'Send for review' }).click();
  await expect(page.getByText('Sent for review. Someone else can now publish it.')).toBeVisible();
  await expect(page.getByText('Waiting for someone else to review and publish it.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Publish' })).toHaveCount(0);
  await page.screenshot({ path: 'test-results/screens/studio-editor.png', fullPage: true });

  // The reviewer finds it waiting and publishes it.
  const context = await browser.newContext();
  const second = await context.newPage();
  await firstLogin(second, reviewer, 'Content');
  await second.getByRole('link', { name: 'Waiting for review' }).click();
  await second
    .getByRole('row', { name: /What is a website/ })
    .getByRole('link', { name: 'Review' })
    .click();
  await second.getByRole('button', { name: 'Publish' }).click();
  await expect(second.getByText('Published: students read this text now.')).toBeVisible();
  await expect(second.getByRole('cell', { name: 'Published here' }).first()).toBeVisible();
  await context.close();

  const rows = await query<{ title: string; source: string }>(
    'SELECT title, source FROM lesson_translations WHERE lesson_id = $1 AND language_code = $2',
    [LESSON, 'fr'],
  );
  expect(rows).toEqual([{ title: 'Qu’est-ce qu’un site web ?', source: 'STUDIO' }]);
});
