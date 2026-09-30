'use client';

import type { components } from '@kcp/api-client-ts';
import { Alert, Badge, Button, Card, Checkbox, Dialog, SelectField, TextField } from '@kcp/ui';
import { type FormEvent, useState } from 'react';
import { useAction } from '@/lib/action';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate, formatDateTime, formatMoney, humanize, parseMoney } from '@/lib/format';
import { useLoad } from '@/lib/hooks';

type Family = components['schemas']['FamilyBillingDto'];
type Payment = Family['payments'][number];
type Subscription = Family['subscriptions'][number];

const REASON_ERROR = 'Write a short reason (at least 3 characters).';

/**
 * A family's plan and payments on the parent's page: the live plan (end it now or at
 * the end of the period), payments (refund), invoices, and recording a payment made
 * another way (bank transfer, wallet, cash).
 */
export function FamilyBillingCard({
  parentId,
  onDone,
}: {
  parentId: string;
  onDone: (message: string) => void;
}) {
  const { state } = useAuth();
  const ability = state.status === 'authenticated' ? state.ability : null;
  const family = useLoad(
    () => api.GET('/v1/admin/users/{id}/billing', { params: { path: { id: parentId } } }),
    parentId,
  );
  const [refunding, setRefunding] = useState<Payment | null>(null);
  const [ending, setEnding] = useState<Subscription | null>(null);
  const canChange = ability?.can('update', 'Payment') ?? false;
  const canRecord = ability?.can('create', 'Payment') ?? false;

  if (family.error) {
    return (
      <Card title="Plan and payments">
        <p className="text-muted">{family.error}</p>
      </Card>
    );
  }
  if (!family.data) {
    return (
      <Card title="Plan and payments">
        <p className="text-muted">Loading…</p>
      </Card>
    );
  }
  const data = family.data;
  const live = data.subscriptions.find((s) => s.status !== 'CANCELED') ?? null;
  const done = (message: string) => {
    family.reload();
    onDone(message);
  };

  return (
    <Card title="Plan and payments">
      <div className="flex flex-col gap-5">
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Children</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {data.children.map((child) => (
              <li key={child.id} className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{child.nickname}</span>
                <Badge tone={child.premium ? 'success' : 'neutral'}>
                  {child.premium ? `Premium (${child.source})` : 'No premium'}
                </Badge>
                {child.until ? (
                  <span className="text-muted">until {formatDate(child.until)}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Plan</h3>
          {live ? (
            <div className="flex flex-col gap-1 text-sm">
              <p className="flex flex-wrap items-center gap-2">
                <strong>{humanize(live.planKey)}</strong>
                <Badge tone={live.status === 'ACTIVE' ? 'success' : 'warning'}>
                  {humanize(live.status)}
                </Badge>
                <span>{live.provider === 'STRIPE' ? 'card' : 'manual'}</span>
              </p>
              <p>
                {formatMoney(live.amountMinor, live.currency)} per period · {live.children}{' '}
                {live.children === 1 ? 'child' : 'children'}
              </p>
              <p>
                {live.cancelAtPeriodEnd
                  ? 'Ends'
                  : live.provider === 'STRIPE'
                    ? 'Renews'
                    : 'Paid until'}{' '}
                {formatDate(live.currentPeriodEnd)}
              </p>
              {live.providerSubscriptionId ? (
                <p className="font-latin break-all text-muted">{live.providerSubscriptionId}</p>
              ) : null}
              {canChange ? (
                <Button
                  size="sm"
                  variant="danger"
                  className="mt-1 self-start"
                  onClick={() => setEnding(live)}
                >
                  End plan
                </Button>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted">No plan running.</p>
          )}
          {data.stripeCustomerId ? (
            <p className="text-sm text-muted">
              Stripe customer: <span className="font-latin">{data.stripeCustomerId}</span>
            </p>
          ) : null}
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Payments</h3>
          {data.payments.length === 0 ? (
            <p className="text-sm text-muted">No payments yet.</p>
          ) : (
            <ul className="flex flex-col gap-3 text-sm">
              {data.payments.map((payment) => (
                <li key={payment.id} className="flex flex-col gap-1 border-b border-line pb-2">
                  <span className="flex flex-wrap items-center gap-2">
                    <strong>{formatMoney(payment.amountMinor, payment.currency)}</strong>
                    <Badge tone={payment.status === 'SUCCEEDED' ? 'success' : 'warning'}>
                      {humanize(payment.status)}
                    </Badge>
                    <span>{payment.provider === 'STRIPE' ? 'Card' : payment.method}</span>
                    {payment.invoiceNumber ? (
                      <span className="font-latin text-muted">{payment.invoiceNumber}</span>
                    ) : null}
                  </span>
                  <span className="text-muted">
                    {formatDateTime(payment.paidAt ?? payment.createdAt)}
                    {payment.reference ? ` · ${payment.reference}` : ''}
                    {payment.recordedBy ? ` · recorded by ${payment.recordedBy}` : ''}
                  </span>
                  {payment.refunds.map((refund) => (
                    <span key={refund.id} className="text-muted">
                      Refunded {formatMoney(refund.amountMinor, payment.currency)} on{' '}
                      {formatDate(refund.createdAt)}: {refund.reason}
                      {refund.createdBy ? ` (${refund.createdBy})` : ''}
                    </span>
                  ))}
                  {canChange &&
                  (payment.status === 'SUCCEEDED' || payment.status === 'PARTIALLY_REFUNDED') ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="self-start"
                      onClick={() => setRefunding(payment)}
                    >
                      Refund
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        {canRecord ? (
          <ManualPayment family={data} liveCard={live?.provider === 'STRIPE'} onDone={done} />
        ) : null}
      </div>
      {refunding ? (
        <RefundDialog
          payment={refunding}
          onClose={() => setRefunding(null)}
          onRefunded={(full) => {
            setRefunding(null);
            done(full ? 'Refunded in full. Premium ended.' : 'Refunded.');
          }}
        />
      ) : null}
      {ending ? (
        <EndPlanDialog
          subscription={ending}
          onClose={() => setEnding(null)}
          onEnded={(now) => {
            setEnding(null);
            done(now ? 'Plan ended. Premium stopped.' : 'Plan will end with its period.');
          }}
        />
      ) : null}
    </Card>
  );
}

function ManualPayment({
  family,
  liveCard,
  onDone,
}: {
  family: Family;
  liveCard: boolean;
  onDone: (message: string) => void;
}) {
  const [planKey, setPlanKey] = useState<'monthly' | 'yearly'>('monthly');
  const [periods, setPeriods] = useState('1');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Bank transfer');
  const [reference, setReference] = useState('');
  const [errors, setErrors] = useState<{ amount?: string; method?: string }>({});
  const action = useAction();
  const currency = family.currency;
  const plan = family.plans.find((p) => p.key === planKey);
  const expected = plan ? plan.totalMinor * Number(periods) : null;

  if (!currency || family.plans.length === 0) {
    return <p className="text-sm text-muted">No prices for this family’s country yet.</p>;
  }
  if (liveCard) {
    return (
      <p className="text-sm text-muted">This family pays by card, so manual payments are off.</p>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: typeof errors = {};
    const amountMinor = amount.trim() ? parseMoney(amount, currency!) : undefined;
    if (amountMinor === null || amountMinor === 0)
      next.amount = 'Type an amount like 1500 or 1500.50.';
    if (method.trim().length < 2) next.method = 'Say how the family paid.';
    setErrors(next);
    if (next.amount || next.method) return;
    const ok = await action.run(() =>
      api.POST('/v1/admin/users/{id}/manual-payments', {
        params: { path: { id: family.parentId } },
        body: {
          planKey,
          periods: Number(periods),
          ...(amountMinor ? { amountMinor } : {}),
          method: method.trim(),
          ...(reference.trim() ? { reference: reference.trim() } : {}),
        },
      }),
    );
    if (ok) {
      setAmount('');
      setReference('');
      onDone('Payment recorded. Premium is on for the family.');
    }
  }

  return (
    <form className="flex flex-col gap-3 border-t border-line pt-4" onSubmit={onSubmit} noValidate>
      <h3 className="font-semibold">Record a payment made another way</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label="Plan"
          value={planKey}
          onChange={(e) => setPlanKey(e.target.value as 'monthly' | 'yearly')}
        >
          {family.plans.map((p) => (
            <option key={p.key} value={p.key}>
              {humanize(p.key)} ({formatMoney(p.totalMinor, currency)} for this family)
            </option>
          ))}
        </SelectField>
        <SelectField
          label={planKey === 'yearly' ? 'Years' : 'Months'}
          value={periods}
          onChange={(e) => setPeriods(e.target.value)}
        >
          {Array.from({ length: planKey === 'yearly' ? 3 : 12 }, (_, i) => String(i + 1)).map(
            (n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ),
          )}
        </SelectField>
        <TextField
          label={`Amount received (${currency})`}
          hint={expected ? `Empty: ${formatMoney(expected, currency)}` : undefined}
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={errors.amount}
        />
        <TextField
          label="Paid with"
          hint="e.g. Bank transfer, JazzCash, Easypaisa, cash"
          value={method}
          maxLength={60}
          onChange={(e) => setMethod(e.target.value)}
          error={errors.method}
        />
        <TextField
          label="Reference"
          hint="The bank’s or wallet’s reference, to find it again."
          value={reference}
          maxLength={120}
          onChange={(e) => setReference(e.target.value)}
        />
      </div>
      {action.error ? <Alert tone="error">{action.error}</Alert> : null}
      <Button type="submit" className="self-start" loading={action.busy}>
        Record payment
      </Button>
    </form>
  );
}

function RefundDialog({
  payment,
  onClose,
  onRefunded,
}: {
  payment: Payment;
  onClose: () => void;
  onRefunded: (full: boolean) => void;
}) {
  const left = payment.amountMinor - payment.refundedMinor;
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<{ amount?: string; reason?: string }>({});
  const action = useAction();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: typeof errors = {};
    const amountMinor = amount.trim() ? parseMoney(amount, payment.currency) : left;
    if (amountMinor === null || amountMinor < 1 || amountMinor > left) {
      next.amount = `Up to ${formatMoney(left, payment.currency)}.`;
    }
    if (reason.trim().length < 3) next.reason = REASON_ERROR;
    setErrors(next);
    if (next.amount || next.reason) return;
    const ok = await action.run(() =>
      api.POST('/v1/admin/billing/payments/{id}/refunds', {
        params: { path: { id: payment.id } },
        body: { amountMinor: amountMinor!, reason: reason.trim() },
      }),
    );
    if (ok) onRefunded(amountMinor === left);
  }

  return (
    <Dialog open onClose={onClose} title="Refund this payment?">
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <p className="text-muted">
          {payment.provider === 'STRIPE'
            ? 'The money goes back to the card through Stripe.'
            : 'Record money you gave back another way.'}{' '}
          A full refund ends the family’s premium straight away; a partial one doesn’t.
        </p>
        <TextField
          label={`Amount (${payment.currency})`}
          hint={`Empty: everything left, ${formatMoney(left, payment.currency)}.`}
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={errors.amount}
        />
        <TextField
          label="Reason"
          hint="Kept with the refund and in the audit log."
          value={reason}
          maxLength={300}
          onChange={(e) => setReason(e.target.value)}
          error={errors.reason}
        />
        {action.error ? <Alert tone="error">{action.error}</Alert> : null}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" loading={action.busy}>
            Refund
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function EndPlanDialog({
  subscription,
  onClose,
  onEnded,
}: {
  subscription: Subscription;
  onClose: () => void;
  onEnded: (now: boolean) => void;
}) {
  const [immediately, setImmediately] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string>();
  const action = useAction();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (reason.trim().length < 3) {
      setReasonError(REASON_ERROR);
      return;
    }
    const ok = await action.run(() =>
      api.POST('/v1/admin/billing/subscriptions/{id}/cancel', {
        params: { path: { id: subscription.id } },
        body: { immediately, reason: reason.trim() },
      }),
    );
    if (ok) onEnded(immediately);
  }

  return (
    <Dialog open onClose={onClose} title="End this plan?">
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <p className="text-muted">
          By default the plan ends with its period ({formatDate(subscription.currentPeriodEnd)}) and
          doesn’t renew. Nothing is refunded; refund a payment separately if needed.
        </p>
        <Checkbox
          label="End it now (premium stops straight away)"
          checked={immediately}
          onChange={(e) => setImmediately(e.target.checked)}
        />
        <TextField
          label="Reason"
          hint="Kept in the audit log."
          value={reason}
          maxLength={300}
          onChange={(e) => setReason(e.target.value)}
          error={reasonError}
        />
        {action.error ? <Alert tone="error">{action.error}</Alert> : null}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" loading={action.busy}>
            End plan
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
