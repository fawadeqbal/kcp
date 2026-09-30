import { expect, test } from './fixtures';
import { finishModule } from './database';
import { createStudent, isolate, logInAsParent, logInAsStudent, MESSAGES } from './helpers';

/** Module 1's title in Arabic (content/builder/m01-first-website/module.yaml). */
const MODULE_AR = 'موقعك الإلكتروني الأول';

const fill = (text: string, values: Record<string, string>) =>
  text.replaceAll(/\{(\w+)\}/g, (_, name: string) => values[name] ?? '');

test('a student gets a certificate, the family hears about it, and anyone can check it (ar)', async ({
  page,
  browser,
  request,
}) => {
  const m = MESSAGES.ar;
  const student = await createStudent(request, { locale: 'ar' });
  await finishModule(student.username, 'builder-m01');

  // The student's portfolio: Module 1 is ready for its certificate.
  await logInAsStudent(page, 'ar', student.username);
  await page.goto('/ar/learn/portfolio');
  const section = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: m.certificates.title }) });
  await expect(section.getByText(m.certificates.ready)).toBeVisible();
  const downloading = page.waitForEvent('download');
  await section.getByRole('button', { name: m.certificates.get }).click();
  const download = await downloading;
  const code = /kcp-certificate-(KCP-[0-9A-Z]{4}-[0-9A-Z]{4})\.pdf$/.exec(
    download.suggestedFilename(),
  )?.[1];
  expect(code).toBeTruthy();
  await expect(section.getByText(code!, { exact: false })).toBeVisible();
  await expect(section.getByRole('button', { name: m.certificates.download })).toBeVisible();

  // The bell says so.
  const bell = page.getByRole('button', { name: fill(m.notifications.bellUnread, { count: '1' }) });
  await expect(bell).toBeVisible();
  await bell.click();
  const panel = page.getByRole('region', { name: m.notifications.title });
  await expect(panel.getByRole('link').first()).toContainText(
    fill(m.notifications.certificateIssued, { module: MODULE_AR }),
  );
  await panel.getByRole('button', { name: m.notifications.markAllRead }).click();
  await expect(page.getByRole('button', { name: m.notifications.bell })).toBeVisible();
  await page.keyboard.press('Escape');

  // The parent sees it on the child's card and in their bell.
  const parentDevice = await browser.newContext();
  const parent = await parentDevice.newPage();
  await logInAsParent(parent, 'ar', student.email);
  const card = parent.getByRole('main');
  await card.getByRole('button', { name: m.dashboard.manage }).click();
  await expect(card.getByRole('heading', { name: m.certificates.title })).toBeVisible();
  await expect(card.getByText(MODULE_AR)).toBeVisible();
  await expect(card.getByRole('button', { name: m.certificates.download })).toBeVisible();
  await parent
    .getByRole('button', { name: fill(m.notifications.bellUnread, { count: '1' }) })
    .click();
  await expect(
    parent.getByRole('region', { name: m.notifications.title }).getByRole('link').first(),
  ).toContainText(student.nickname);
  await parentDevice.close();

  // Anyone (signed out) can check the code: real, with the nickname only.
  const visitor = await browser.newContext();
  const check = await visitor.newPage();
  await check.goto(`/ar/certificates/${code}`);
  await expect(check.getByRole('heading', { name: m.certificates.verifyValid })).toBeVisible();
  await expect(check.getByText(isolate(student.nickname), { exact: false })).toBeVisible();
  await expect(check.getByText(m.certificates.verifyPrivacy)).toBeVisible();
  await expect(check.locator('html')).toHaveAttribute('dir', 'rtl');
  await check.goto('/ar/certificates/KCP-2222-2222');
  await expect(
    check.getByText(fill(m.certificates.verifyNotFound, { code: 'KCP-2222-2222' })),
  ).toBeVisible();
  await visitor.close();
});
