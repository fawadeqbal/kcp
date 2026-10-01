import { roomWith, setAge } from './database';
import { expect, test } from './fixtures';
import { createStudent, isolate, logInAsParent, logInAsStudent, MESSAGES } from './helpers';

/*
 * Team rooms: ready-made phrases for everyone, typed (filtered) text from 13, live
 * messages, reports to the moderators, and parents reading their child's rooms.
 */

const m = MESSAGES.en;
const fill = (template: string, values: Record<string, string | number>) =>
  template.replaceAll(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));

test('teammates talk in their room, report a message, and a parent reads along', async ({
  page,
  browser,
  request,
}) => {
  const older = await createStudent(request);
  const younger = await createStudent(request);
  await setAge(younger.username, 11);
  const name = `Team ${Math.floor(Math.random() * 9000 + 1000)}`;
  await roomWith(name, [older.username, younger.username]);

  // The older student opens rooms from the friends page.
  await logInAsStudent(page, 'en', older.username);
  await page.getByRole('link', { name: m.nav.friends }).click();
  await page
    .getByRole('navigation', { name: m.rooms.tabsLabel })
    .getByRole('link', { name: m.rooms.tabRooms })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: m.rooms.title })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name })).toBeVisible();
  await expect(page.getByText(m.rooms.empty)).toBeVisible();
  const log = page.getByRole('log');

  await page.getByRole('button', { name: m.rooms.phrases.hello }).click();
  await expect(log.getByText(m.rooms.phrases.hello)).toBeVisible();
  const box = page.getByLabel(m.rooms.typeLabel);
  await box.fill('call me on 0300 1234567');
  await page.getByRole('button', { name: m.rooms.send }).click();
  await expect(page.getByText(m.rooms.blocked.PHONE)).toBeVisible();
  await box.fill('I will build the header');
  await page.getByRole('button', { name: m.rooms.send }).click();
  await expect(log.getByText('I will build the header')).toBeVisible();
  await expect(box).toHaveValue('');

  // The younger one (11) sends phrases only, and sees the older one's messages.
  const other = await browser.newPage();
  await logInAsStudent(other, 'en', younger.username);
  await other.goto('/en/learn/rooms');
  const theirLog = other.getByRole('log');
  await expect(theirLog.getByText('I will build the header')).toBeVisible();
  await expect(other.getByText(m.rooms.phrasesOnly)).toBeVisible();
  await expect(other.getByLabel(m.rooms.typeLabel)).toHaveCount(0);
  await other.getByRole('button', { name: m.rooms.phrases['great-job'] }).click();
  // It arrives on the older student's page by itself.
  await expect(log.getByText(m.rooms.phrases['great-job'])).toBeVisible();

  // Reporting a message.
  await other
    .getByRole('button', {
      name: fill(m.rooms.reportMessage, { name: isolate(older.nickname) }),
    })
    .last()
    .click();
  const dialog = other.getByRole('dialog', { name: m.rooms.reportTitle });
  await dialog.getByLabel(m.rooms.reasons.PERSONAL_INFO).check();
  await dialog.getByRole('button', { name: m.rooms.reportSend }).click();
  await expect(other.getByText(m.rooms.reported)).toBeVisible();
  await other.close();

  // The younger one's parent reads the room from the child's card.
  await logInAsParent(page, 'en', younger.email);
  await page.getByRole('button', { name: m.dashboard.manage }).click();
  await page.getByRole('link', { name: 'Team room (1)' }).click();
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: fill(m.rooms.childTitle, { nickname: isolate(younger.nickname) }),
    }),
  ).toBeVisible();
  await expect(page.getByRole('log').getByText('I will build the header')).toBeVisible();
  await expect(page.getByText(m.rooms.parentSafety)).toBeVisible();
  await expect(page.getByRole('button', { name: m.rooms.phrases.hello })).toHaveCount(0);
});

test('a student in no rooms sees how rooms start', async ({ page, request }) => {
  const student = await createStudent(request);
  await logInAsStudent(page, 'en', student.username);
  await page.goto('/en/learn/rooms');
  await expect(page.getByText(m.rooms.none)).toBeVisible();
});
