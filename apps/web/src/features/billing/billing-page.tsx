'use client';

import type { components } from '@kcp/api-client-ts';
import { clsx } from 'clsx';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { BackLink } from '@/components/back-link';
import { Alert, Avatar, Badge, Button, Card, Dialog, PageSpinner } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { api, errorCode } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import { useAccount } from '@/lib/use-account';

type Billing = components['schemas']['BillingDto'];
type Plan = Billing['plans'][number];
type Subscription = NonNullable<Billing['subscription']>;

/** Where families write to pay by bank transfer or wallet. */
const BILLING_EMAIL = process.env.NEXT_PUBLIC_BILLING_EMAIL ?? 'billing@kidscoding.example';
const POLL_MS = 1500;
const POLL_TIMES = 20;

/**
 * The family's plan: each child's premium, prices in the family's currency (with the
 * family discount), paying by card (Stripe Checkout), cancelling, resuming, switching
 * between monthly and yearly, and invoices.
 */
export function BillingPage() {
  const t = useTranslations('billing');
  const format = useFormatter();
  const locale = useLocale();
  const user = useAccount('ADULT');
  const params = useSearchParams();
  const returned = params.get('checkout');
  const [billing, setBilling] = useState<Billing | null>(null);
  const [failed, setFailed] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(
    returned === 'success'
      ? { tone: 'info', text: t('checkoutPending') }
      : returned === 'canceled'
        ? { tone: 'info', text: t('checkoutCanceled') }
        : null,
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'cancel' | Plan | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.GET('/v1/billing');
      if (data) setBilling(data);
      else setFailed(true);
      return data ?? null;
    } catch {
      setFailed(true);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const poll = { cancelled: false };
    void (async () => {
      const first = await load();
      // Back from Stripe: the payment is confirmed by a webhook, a moment later.
      if (returned !== 'success' || poll.cancelled) return;
      let current = first;
      for (let i = 0; i < POLL_TIMES && !isLive(current) && !poll.cancelled; i++) {
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
        current = await load();
      }
      if (poll.cancelled) return;
      setNotice(
        isLive(current)
          ? { tone: 'success', text: t('checkoutSuccess') }
          : { tone: 'info', text: t('checkoutSlow') },
      );
    })();
    return () => {
      poll.cancelled = true;
    };
  }, [user, load, returned, t]);

  if (!user) return <PageSpinner />;
  if (failed && !billing) return <Alert tone="error">{t('loadFailed')}</Alert>;
  if (!billing) return <PageSpinner />;

  const money = (minor: number) => formatMoney(locale, minor, billing.currency ?? 'USD');
  const date = (value: string) => format.dateTime(new Date(value), { dateStyle: 'long' });
  const live = isLive(billing) ? billing.subscription : null;

  async function run(key: string, call: () => Promise<{ response: Response; error?: unknown }>) {
    setBusy(key);
    setNotice(null);
    try {
      const { response, error } = await call();
      if (!response.ok) {
        setNotice({ tone: 'error', text: failureText(t, errorCode(error)) });
        return false;
      }
      return true;
    } catch {
      setNotice({ tone: 'error', text: t('actionFailed') });
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function checkout(plan: Plan) {
    let url: string | null = null;
    const ok = await run(`checkout-${plan.key}`, async () => {
      const result = await api.POST('/v1/billing/checkout', {
        body: { planKey: plan.key, locale: locale as 'en' | 'ar' | 'ur' },
      });
      url = result.data?.url ?? null;
      return result;
    });
    if (ok && url) {
      setNotice({ tone: 'info', text: t('redirecting') });
      window.location.assign(url);
    }
  }

  async function cancelPlan() {
    if (await run('cancel', () => api.POST('/v1/billing/cancel'))) {
      setDialog(null);
      const updated = await load();
      if (updated?.subscription) {
        setNotice({
          tone: 'success',
          text: t('canceled', { date: date(updated.subscription.currentPeriodEnd) }),
        });
      }
    }
  }

  async function resume() {
    if (await run('resume', () => api.POST('/v1/billing/resume'))) {
      await load();
      setNotice({ tone: 'success', text: t('resumed') });
    }
  }

  async function switchPlan(plan: Plan) {
    if (await run('switch', () => api.POST('/v1/billing/plan', { body: { planKey: plan.key } }))) {
      setDialog(null);
      await load();
      setNotice({ tone: 'success', text: t('switched', { plan: t(plan.key) }) });
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <nav aria-label={t('breadcrumb')} className="text-sm">
        <BackLink href="/dashboard">{t('backToDashboard')}</BackLink>
      </nav>
      <header>
        <h1 className="text-4xl">{t('title')}</h1>
        <p className="mt-2 max-w-2xl text-muted">{t('subtitle')}</p>
      </header>

      <div aria-live="polite">
        {notice ? (
          <Alert tone={notice.tone === 'info' ? 'info' : notice.tone} live={false}>
            {notice.text}
          </Alert>
        ) : null}
      </div>

      <section aria-labelledby="kids-heading" className="flex flex-col gap-3">
        <h2 id="kids-heading" className="text-2xl">
          {t('childrenTitle')}
        </h2>
        {billing.children.length === 0 ? (
          <p className="text-muted">
            {t('noChildren')}{' '}
            <Link href="/children/new" className="font-semibold text-brand-text underline">
              {t('addChild')}
            </Link>
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {billing.children.map((child) => (
              <li key={child.id} className="flex items-center gap-3 rounded-row bg-surface p-3">
                <Avatar avatarKey={child.avatarKey} size="sm" />
                <span className="font-latin font-semibold">
                  <bdi>{child.nickname}</bdi>
                </span>
                <span className="ms-auto">
                  <Badge tone={child.premium ? 'success' : 'neutral'}>
                    {child.source === 'subscription'
                      ? t('childPlan')
                      : child.source === 'grant' && child.until
                        ? t('childGrant', { date: date(child.until) })
                        : child.source === 'trial' && child.until
                          ? t('childTrial', { date: date(child.until) })
                          : t('childNone')}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {live ? (
        <CurrentPlan
          subscription={live}
          money={money}
          date={date}
          busy={busy}
          plans={billing.plans}
          onCancel={() => setDialog('cancel')}
          onResume={resume}
          onSwitch={(plan) => setDialog(plan)}
        />
      ) : (
        <section aria-labelledby="plans-heading" className="flex flex-col gap-4">
          <h2 id="plans-heading" className="text-2xl">
            {t('plansTitle')}
          </h2>
          <p className="text-muted">{t('trialNote', { days: String(billing.trialDays) })}</p>
          {billing.plans.length === 0 ? (
            <Alert tone="info">{t('noPrices')}</Alert>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {billing.plans.map((plan) => (
                <PlanCard
                  key={plan.key}
                  plan={plan}
                  money={money}
                  discount={billing.familyDiscountPercent ?? 0}
                  canBuy={billing.checkoutAvailable && billing.children.length > 0}
                  busy={busy === `checkout-${plan.key}`}
                  onBuy={() => void checkout(plan)}
                />
              ))}
            </div>
          )}
          {!billing.checkoutAvailable && billing.plans.length ? (
            <p className="text-sm text-muted">{t('checkoutUnavailable')}</p>
          ) : null}
          <Card title={t('otherWaysTitle')}>
            <p className="text-muted">
              {t('otherWaysBody', { email: BILLING_EMAIL })}{' '}
              <a
                href={`mailto:${BILLING_EMAIL}`}
                className="font-latin font-semibold text-brand-text underline"
              >
                <bdi>{BILLING_EMAIL}</bdi>
              </a>
            </p>
          </Card>
        </section>
      )}

      <section aria-labelledby="invoices-heading" className="flex flex-col gap-3">
        <h2 id="invoices-heading" className="text-2xl">
          {t('invoicesTitle')}
        </h2>
        {billing.invoices.length === 0 ? (
          <p className="text-muted">{t('invoicesEmpty')}</p>
        ) : (
          <div className="overflow-x-auto rounded-row bg-surface">
            <table className="w-full min-w-[32rem] text-start text-sm">
              <caption className="sr-only">{t('invoicesTitle')}</caption>
              <thead className="bg-canvas text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2 text-start">
                    {t('invoiceNumber')}
                  </th>
                  <th scope="col" className="px-4 py-2 text-start">
                    {t('invoiceDate')}
                  </th>
                  <th scope="col" className="px-4 py-2 text-start">
                    {t('invoiceAmount')}
                  </th>
                  <th scope="col" className="px-4 py-2 text-start">
                    {t('invoiceStatus')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {billing.invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-4 py-2">
                      <Link
                        href={`/billing/invoices/${invoice.id}`}
                        className="font-latin font-semibold text-brand-text underline"
                      >
                        <bdi>{invoice.number}</bdi>
                      </Link>
                    </td>
                    <td className="px-4 py-2">{date(invoice.issuedAt)}</td>
                    <td className="px-4 py-2">
                      <bdi>{formatMoney(locale, invoice.amountMinor, invoice.currency)}</bdi>
                    </td>
                    <td className="px-4 py-2">
                      <Badge tone={invoice.status === 'PAID' ? 'success' : 'neutral'}>
                        {t(`invoice${invoice.status}`)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={dialog === 'cancel'} onClose={() => setDialog(null)} title={t('cancelTitle')}>
        <p className="text-muted">
          {live ? t('cancelBody', { date: date(live.currentPeriodEnd) }) : null}
        </p>
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={() => setDialog(null)}>
            {t('keepPlan')}
          </Button>
          <Button variant="danger" loading={busy === 'cancel'} onClick={() => void cancelPlan()}>
            {t('cancelConfirm')}
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={dialog !== null && dialog !== 'cancel'}
        onClose={() => setDialog(null)}
        title={dialog && dialog !== 'cancel' ? t('switchTitle', { plan: t(dialog.key) }) : ''}
      >
        {dialog && dialog !== 'cancel' ? (
          <>
            <p className="text-muted">{t('switchBody', { price: money(dialog.totalMinor) })}</p>
            <div className="flex flex-wrap justify-end gap-3">
              <Button variant="secondary" onClick={() => setDialog(null)}>
                {t('keepPlan')}
              </Button>
              <Button loading={busy === 'switch'} onClick={() => void switchPlan(dialog)}>
                {t('switchConfirm')}
              </Button>
            </div>
          </>
        ) : null}
      </Dialog>
    </div>
  );
}

const isLive = (billing: Billing | null) =>
  billing?.subscription?.status === 'ACTIVE' || billing?.subscription?.status === 'PAST_DUE';

function failureText(t: ReturnType<typeof useTranslations<'billing'>>, code: string | undefined) {
  switch (code) {
    case 'ALREADY_SUBSCRIBED':
      return t('errorAlreadySubscribed');
    case 'NO_CHILDREN':
      return t('noChildren');
    case 'PAYMENTS_OFF':
    case 'CARDS_UNAVAILABLE':
      return t('checkoutUnavailable');
    case 'NO_PRICE':
    case 'NO_COUNTRY':
      return t('noPrices');
    case 'MANUAL_PLAN':
      return t('errorManualPlan');
    default:
      return t('actionFailed');
  }
}

function PlanCard({
  plan,
  money,
  discount,
  canBuy,
  busy,
  onBuy,
}: {
  plan: Plan;
  money: (minor: number) => string;
  discount: number;
  canBuy: boolean;
  busy: boolean;
  onBuy: () => void;
}) {
  const t = useTranslations('billing');
  const yearly = plan.interval === 'YEAR';
  return (
    <div
      className={clsx(
        'flex flex-col gap-3 rounded-card border bg-surface p-5',
        yearly ? 'border-primary' : 'border-line',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xl">{t(plan.key)}</h3>
        {yearly ? <Badge tone="brand">{t('yearlySaving')}</Badge> : null}
      </div>
      <p>
        <span className="font-display text-4xl">
          <bdi>{money(plan.totalMinor)}</bdi>
        </span>{' '}
        <span className="text-muted">{yearly ? t('perYear') : t('perMonth')}</span>
      </p>
      {plan.extraChildren > 0 ? (
        <p className="text-sm text-muted">
          {t('familyBreakdown', {
            first: money(plan.unitMinor),
            extra: money(plan.extraUnitMinor),
            discount: String(discount),
          })}
        </p>
      ) : (
        <p className="text-sm text-muted">{t('familyNote', { discount: String(discount) })}</p>
      )}
      <Button
        className="mt-auto"
        variant={yearly ? 'primary' : 'secondary'}
        loading={busy}
        aria-disabled={!canBuy}
        onClick={() => canBuy && onBuy()}
      >
        {t('payByCard')}
      </Button>
    </div>
  );
}

function CurrentPlan({
  subscription,
  money,
  date,
  busy,
  plans,
  onCancel,
  onResume,
  onSwitch,
}: {
  subscription: Subscription;
  money: (minor: number) => string;
  date: (value: string) => string;
  busy: string | null;
  plans: Plan[];
  onCancel: () => void;
  onResume: () => void;
  onSwitch: (plan: Plan) => void;
}) {
  const t = useTranslations('billing');
  const other = plans.find((p) => p.key !== subscription.planKey);
  const card = subscription.provider === 'STRIPE';
  return (
    <section aria-labelledby="plan-heading">
      <Card title={<span id="plan-heading">{t('currentTitle')}</span>}>
        <div className="flex flex-col gap-3">
          <p className="flex flex-wrap items-center gap-2">
            <strong className="text-lg">{t(subscription.planKey as 'monthly' | 'yearly')}</strong>
            <Badge tone={subscription.status === 'ACTIVE' ? 'success' : 'warning'}>
              {subscription.status === 'ACTIVE' ? t('statusActive') : t('statusPastDue')}
            </Badge>
            <span className="text-muted">
              <bdi>{money(subscription.amountMinor)}</bdi>{' '}
              {subscription.planKey === 'yearly' ? t('perYear') : t('perMonth')} ·{' '}
              {t('childrenCovered', { count: String(subscription.children) })}
            </span>
          </p>
          {subscription.status === 'PAST_DUE' ? (
            <Alert tone="warning">{t('pastDueBody')}</Alert>
          ) : null}
          <p>
            {subscription.cancelAtPeriodEnd
              ? t('endsOn', { date: date(subscription.currentPeriodEnd) })
              : card
                ? t('renewsOn', { date: date(subscription.currentPeriodEnd) })
                : t('manualUntil', { date: date(subscription.currentPeriodEnd) })}
          </p>
          {!card ? <p className="text-sm text-muted">{t('manualNote')}</p> : null}
          <div className="flex flex-wrap gap-3">
            {subscription.cancelAtPeriodEnd ? (
              <Button loading={busy === 'resume'} onClick={onResume}>
                {t('keepPlan')}
              </Button>
            ) : (
              <>
                {card && other ? (
                  <Button variant="secondary" onClick={() => onSwitch(other)}>
                    {other.key === 'yearly' ? t('switchToYearly') : t('switchToMonthly')}
                  </Button>
                ) : null}
                <Button variant="secondary" onClick={onCancel}>
                  {t('cancel')}
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>
    </section>
  );
}
