import { expect, test } from './fixtures';
import { endTrial } from './database';
import { createStudent, logInAsParent, logInAsStudent, MESSAGES } from './helpers';

/*
 * Plans and payments (Sprint 6): premium lessons lock when the trial ends, a parent
 * pays by card (the development mock of Stripe Checkout, with signed webhooks), and
 * premium opens for the child. The refund is in the admin panel's tests.
 */

const PYTHON_LESSON = 'builder-m02-l01';

test('a parent pays by card and premium opens for their child (en)', async ({
  browser,
  request,
}) => {
  test.setTimeout(120_000);
  const m = MESSAGES.en;
  const family = await createStudent(request, { locale: 'en' });
  await endTrial(family.username);

  // The child: Python lessons are locked now.
  const kidContext = await browser.newContext();
  const kid = await kidContext.newPage();
  await logInAsStudent(kid, 'en', family.username);
  await expect(kid.getByText(m.learn.trialEnded)).toBeVisible();
  await expect(kid.getByText(m.learn.premiumTag).first()).toBeVisible();
  await kid.goto(`/en/learn/${PYTHON_LESSON}`);
  await expect(kid.getByRole('heading', { name: m.learn.lockedLessonTitle })).toBeVisible();

  // The parent: plans in their currency, then Stripe Checkout (the mock).
  const parentContext = await browser.newContext();
  const parent = await parentContext.newPage();
  await logInAsParent(parent, 'en', family.email);
  await parent.getByRole('link', { name: m.nav.billing }).click();
  await expect(parent.getByRole('heading', { name: m.billing.title, level: 1 })).toBeVisible();
  await expect(parent.getByText(m.billing.childNone)).toBeVisible();
  await expect(parent.getByText('PKR', { exact: false }).first()).toBeVisible();
  await parent.screenshot({ path: 'test-results/screens/billing-plans-en.png', fullPage: true });
  await parent.getByRole('button', { name: m.billing.payByCard }).first().click();
  await expect(parent).toHaveURL(/\/v1\/payments\/mock-stripe\/checkout\//);
  await expect(parent.getByText('Test mode.')).toBeVisible();
  await parent.getByRole('button', { name: /with a test card/ }).click();

  // Back on the billing page: the webhook arrives, premium is on.
  await expect(parent).toHaveURL(/\/en\/billing\?checkout=success$/);
  await expect(parent.getByText(m.billing.checkoutSuccess)).toBeVisible({ timeout: 30_000 });
  await expect(parent.getByText(m.billing.childPlan)).toBeVisible();
  await expect(parent.getByRole('heading', { name: m.billing.currentTitle })).toBeVisible();
  await parent.screenshot({ path: 'test-results/screens/billing-active-en.png', fullPage: true });
  const invoice = parent.getByRole('link', { name: /^KCP-\d{6}$/ });
  await invoice.click();
  await expect(parent.getByRole('heading', { name: /^Invoice KCP-\d{6}$/ })).toBeVisible();
  await expect(parent.getByText(m.billing.lineFirst)).toBeVisible();

  // Cancelling keeps premium until the period ends.
  await parent.getByRole('link', { name: m.billing.backToBilling }).click();
  await parent.getByRole('button', { name: m.billing.cancel }).click();
  await parent.getByRole('dialog').getByRole('button', { name: m.billing.cancelConfirm }).click();
  await expect(parent.getByText(/Your plan is cancelled\. Premium stays on until/)).toBeVisible();
  await parent.getByRole('button', { name: m.billing.keepPlan }).click();
  await expect(parent.getByText(m.billing.resumed)).toBeVisible();

  // The child: the Python lesson opens.
  await kid.goto(`/en/learn/${PYTHON_LESSON}`);
  await expect(kid.getByRole('heading', { name: 'Hello, Python', level: 1 })).toBeVisible();
  await kidContext.close();
  await parentContext.close();
});
