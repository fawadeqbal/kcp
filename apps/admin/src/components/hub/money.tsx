'use client';

import type { components } from '@kcp/api-client-ts';
import { Alert, Badge, Button, Card, Dialog, PageSpinner, SelectField, TextField } from '@kcp/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';
import { useAction } from '@/lib/action';
import { api } from '@/lib/api';
import { formatDate, formatDateTime, formatMoney, parseMoney } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { Cell, Details, Table } from '../data';
import { HubBadge, HubPage, linkClass, useIsSuperAdmin } from './hub-shell';

type Batch = components['schemas']['PayoutBatchDetailDto'];
type Payout = components['schemas']['AdminPayoutDto'];
type Account = components['schemas']['AdminPayoutAccountDto'];
type LeadPayable = components['schemas']['LeadPayableDto'];

const CURRENCIES = ['USD', 'PKR', 'EGP', 'AED', 'SAR'] as const;

/** Admin → Hub → Payouts: who can be paid, the batches, and lead developers’ pay. */
export function HubPayoutsPage() {
  const router = useRouter();
  const [currency, setCurrency] = useState<string>('USD');
  const ready = useLoad(
    () => api.GET('/v1/admin/hub/payouts/ready', { params: { query: { currency } } }),
    currency,
  );
  const batches = useLoad(() => api.GET('/v1/admin/hub/payouts/batches'), 'batches');
  const leads = useLoad(() => api.GET('/v1/admin/hub/leads/payable'), 'leads');
  const [making, setMaking] = useState(false);
  const [provider, setProvider] = useState<'WISE' | 'MANUAL'>('MANUAL');
  const [note, setNote] = useState('');
  const [paying, setPaying] = useState<LeadPayable | null>(null);
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const action = useAction();
  return (
    <HubPage
      title="Payouts"
      description="Students’ payable earnings are paid to their parents in batches: each parent confirms, two different super admins approve, then it’s sent (Wise) or paid by hand and recorded. Nothing is batched or sent unless the hub_payouts flag is on for the student’s country."
      actions={
        <Button size="sm" onClick={() => setMaking(true)}>
          Make a batch
        </Button>
      }
    >
      <div aria-live="polite">{notice ? <Alert tone="success">{notice}</Alert> : null}</div>
      <Card title="Ready to pay">
        <SelectField
          label="Currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        >
          {CURRENCIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </SelectField>
        {ready.error ? <Alert tone="error">{ready.error}</Alert> : null}
        <div className="mt-3">
          <Table
            bare
            caption="Students with payable money"
            columns={['Student', 'Payable', 'Held', 'Parent', 'Account', '']}
            empty={(ready.data ?? []).length === 0}
            emptyText="Nobody has payable money in this currency."
          >
            {(ready.data ?? []).map((row) => (
              <tr key={`${row.studentId}-${row.currency}`}>
                <Cell>{row.nickname}</Cell>
                <Cell>{formatMoney(row.payableMinor, row.currency)}</Cell>
                <Cell>{formatMoney(row.heldMinor, row.currency)}</Cell>
                <Cell>{row.parentName ?? <Badge tone="warning">No parent agreement</Badge>}</Cell>
                <Cell>
                  {row.accountState ? (
                    <>
                      <HubBadge status={row.accountState} />{' '}
                      <span className="text-sm text-muted">{row.accountKind}</span>
                    </>
                  ) : (
                    <Badge tone="warning">No account</Badge>
                  )}
                </Cell>
                <Cell>
                  {row.inProgress ? <Badge tone="brand">Payout in progress</Badge> : null}
                </Cell>
              </tr>
            ))}
          </Table>
        </div>
      </Card>
      <Card title="Batches">
        {batches.error ? <Alert tone="error">{batches.error}</Alert> : null}
        <Table
          bare
          caption="Payout batches"
          columns={['Batch', 'Made', 'Approvals', 'Payouts', 'Total', 'State']}
          empty={(batches.data ?? []).length === 0}
          emptyText="No batches yet."
        >
          {(batches.data ?? []).map((b) => (
            <tr key={b.id}>
              <Cell>
                <Link href={`/hub/payouts/${b.id}`} className={linkClass}>
                  {b.reference} · {b.provider === 'WISE' ? 'Wise' : 'By hand'} · {b.currency}
                </Link>
                {b.note ? <span className="block text-sm text-muted">{b.note}</span> : null}
              </Cell>
              <Cell>
                {formatDate(b.createdAt)}
                <span className="block text-sm text-muted">{b.createdByName}</span>
              </Cell>
              <Cell>{b.approvals.length} of 2</Cell>
              <Cell>
                {b.confirmedCount} confirmed · {b.paidCount} paid
                {b.failedCount ? ` · ${b.failedCount} failed` : ''} (of {b.payoutCount})
              </Cell>
              <Cell>{formatMoney(b.totalNetMinor, b.currency)}</Cell>
              <Cell>
                <HubBadge status={b.status} />
              </Cell>
            </tr>
          ))}
        </Table>
      </Card>
      <Card title="Lead developers">
        <p className="mb-3 text-sm text-muted">
          Leads are paid by hand (bank transfer). Record each payment here after it’s made.
        </p>
        <Table
          bare
          caption="Owed to lead developers"
          columns={['Lead', 'Owed', '']}
          empty={(leads.data ?? []).length === 0}
          emptyText="Nothing owed."
        >
          {(leads.data ?? []).map((row) => (
            <tr key={`${row.leadId}-${row.currency}`}>
              <Cell>{row.name}</Cell>
              <Cell>{formatMoney(row.payableMinor, row.currency)}</Cell>
              <Cell>
                <Button size="sm" variant="secondary" onClick={() => setPaying(row)}>
                  Record a payment
                </Button>
              </Cell>
            </tr>
          ))}
        </Table>
      </Card>
      {making ? (
        <Dialog open onClose={() => setMaking(false)} title="Make a payout batch">
          <form
            className="flex flex-col gap-4"
            onSubmit={async (event) => {
              event.preventDefault();
              let id: string | undefined;
              if (
                await action.run(async () => {
                  const result = await api.POST('/v1/admin/hub/payouts/batches', {
                    body: { currency, provider, ...(note.trim() ? { note: note.trim() } : {}) },
                  });
                  id = result.data?.id;
                  return result;
                })
              ) {
                if (id) router.push(`/hub/payouts/${id}`);
              }
            }}
          >
            {action.error ? <Alert tone="error">{action.error}</Alert> : null}
            <p>
              Everyone ready to be paid in <strong>{currency}</strong> (at least 10.00, a checked
              account past its 48 hours, no payout in progress). Their parents are emailed to
              confirm.
            </p>
            <SelectField
              label="How"
              value={provider}
              onChange={(e) => setProvider(e.target.value as 'WISE' | 'MANUAL')}
            >
              <option value="MANUAL">By hand (bank or wallet), then recorded</option>
              <option value="WISE">Through Wise (IBAN accounts only)</option>
            </SelectField>
            <TextField
              label="Note (staff only)"
              value={note}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex gap-2">
              <Button type="submit" loading={action.busy}>
                Make the batch
              </Button>
              <Button variant="ghost" onClick={() => setMaking(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Dialog>
      ) : null}
      {paying ? (
        <Dialog open onClose={() => setPaying(null)} title={`Payment to ${paying.name}`}>
          <form
            className="flex flex-col gap-4"
            onSubmit={async (event) => {
              event.preventDefault();
              const minor = parseMoney(amount, paying.currency);
              if (minor === null) return;
              if (
                await action.run(() =>
                  api.POST('/v1/admin/hub/leads/{leadId}/payments', {
                    params: { path: { leadId: paying.leadId } },
                    body: {
                      currency: paying.currency,
                      amountMinor: minor,
                      reference: reference.trim(),
                    },
                  }),
                )
              ) {
                setNotice(`Payment to ${paying.name} recorded.`);
                setPaying(null);
                setAmount('');
                setReference('');
                leads.reload();
              }
            }}
          >
            {action.error ? <Alert tone="error">{action.error}</Alert> : null}
            <p>Owed: {formatMoney(paying.payableMinor, paying.currency)}.</p>
            <TextField
              label={`Amount paid (${paying.currency})`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <TextField
              label="Bank reference"
              value={reference}
              maxLength={120}
              onChange={(e) => setReference(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                loading={action.busy}
                disabled={
                  parseMoney(amount, paying.currency) === null || reference.trim().length < 2
                }
              >
                Record
              </Button>
              <Button variant="ghost" onClick={() => setPaying(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </Dialog>
      ) : null}
    </HubPage>
  );
}

/** One batch: its payouts, the approvals, sending, and recording payments by hand. */
export function HubBatchDetail({ id }: { id: string }) {
  const superAdmin = useIsSuperAdmin();
  const data = useLoad(
    () => api.GET('/v1/admin/hub/payouts/batches/{id}', { params: { path: { id } } }),
    id,
  );
  const [recording, setRecording] = useState<Payout | null>(null);
  const [cancelling, setCancelling] = useState<Payout | null>(null);
  const [settling, setSettling] = useState<Payout | null>(null);
  const [outcome, setOutcome] = useState<'TRANSFER_FOUND' | 'NO_TRANSFER'>('TRANSFER_FOUND');
  const [transferId, setTransferId] = useState('');
  const [method, setMethod] = useState('Bank transfer');
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const action = useAction();
  if (data.error) return <Alert tone="error">{data.error}</Alert>;
  if (!data.data) return <PageSpinner label="Loading" />;
  const b: Batch = data.data;
  const act = async (
    call: () => Promise<{ error?: unknown; response: Response }>,
    text: string,
  ) => {
    if (await action.run(call)) {
      setNotice(text);
      data.reload();
      return true;
    }
    return false;
  };
  return (
    <HubPage
      title={`Batch ${b.reference}`}
      description={`${b.provider === 'WISE' ? 'Through Wise' : 'Paid by hand'} · ${b.currency} · made ${formatDate(b.createdAt)} by ${b.createdByName}`}
      actions={
        <span className="flex flex-wrap gap-2">
          {b.status === 'DRAFT' && superAdmin ? (
            <Button
              size="sm"
              loading={action.busy}
              onClick={() =>
                void act(
                  () =>
                    api.POST('/v1/admin/hub/payouts/batches/{id}/approve', {
                      params: { path: { id } },
                    }),
                  'Approved.',
                )
              }
            >
              Approve
            </Button>
          ) : null}
          {b.status === 'APPROVED' && superAdmin ? (
            <Button
              size="sm"
              loading={action.busy}
              onClick={() =>
                void act(
                  () =>
                    api.POST('/v1/admin/hub/payouts/batches/{id}/send', {
                      params: { path: { id } },
                    }),
                  b.provider === 'WISE'
                    ? 'Sent to Wise.'
                    : 'Released: pay each payout and record it.',
                )
              }
            >
              {b.provider === 'WISE' ? 'Send through Wise' : 'Release for payment'}
            </Button>
          ) : null}
          {b.status === 'DRAFT' || b.status === 'APPROVED' ? (
            <Button
              size="sm"
              variant="ghost"
              loading={action.busy}
              onClick={() =>
                void act(
                  () =>
                    api.POST('/v1/admin/hub/payouts/batches/{id}/cancel', {
                      params: { path: { id } },
                    }),
                  'Batch cancelled.',
                )
              }
            >
              Cancel batch
            </Button>
          ) : null}
        </span>
      }
    >
      <p>
        <Link href="/hub/payouts" className={linkClass}>
          All payouts
        </Link>
      </p>
      <div aria-live="polite">
        {notice ? <Alert tone="success">{notice}</Alert> : null}
        {action.error ? <Alert tone="error">{action.error}</Alert> : null}
      </div>
      <Card title="State">
        <Details
          items={[
            ['State', <HubBadge key="s" status={b.status} />],
            [
              'Approvals',
              b.approvals.length
                ? b.approvals.map((a) => `${a.name} (${formatDateTime(a.at)})`).join(', ')
                : 'None yet: two different super admins approve.',
            ],
            ['Sent', b.sentAt ? formatDateTime(b.sentAt) : '—'],
            ['Total to pay', formatMoney(b.totalNetMinor, b.currency)],
            ...(b.note ? ([['Note', b.note]] as [string, string][]) : []),
          ]}
        />
        {!superAdmin && (b.status === 'DRAFT' || b.status === 'APPROVED') ? (
          <p className="mt-3 text-sm text-muted">Only super admins approve and send batches.</p>
        ) : null}
      </Card>
      <Table
        caption="Payouts"
        columns={['Payout', 'Parent and account', 'Amount', 'State', '']}
        empty={b.payouts.length === 0}
        emptyText="No payouts."
      >
        {b.payouts.map((p) => (
          <tr key={p.id}>
            <Cell>
              {p.reference} · {p.nickname}
              {p.parentConfirmedAt ? (
                <span className="block text-sm text-muted">
                  Confirmed {formatDateTime(p.parentConfirmedAt)}
                </span>
              ) : null}
            </Cell>
            <Cell>
              {p.parentName}
              <span className="block text-sm text-muted">
                {p.accountKind} •••• {p.accountLast4}
              </span>
            </Cell>
            <Cell>
              {formatMoney(p.netMinor, p.currency)}
              {p.withheldMinor ? (
                <span className="block text-sm text-muted">
                  {formatMoney(p.withheldMinor, p.currency)} withheld
                </span>
              ) : null}
            </Cell>
            <Cell>
              <HubBadge status={p.status} />
              {p.providerTransferId ? (
                <span className="block text-sm text-muted">
                  Wise {p.providerTransferId} · {p.providerStatus}
                </span>
              ) : null}
              {p.failureReason ? (
                <span className="block text-sm text-muted">{p.failureReason}</span>
              ) : null}
              {p.paymentReference ? (
                <span className="block text-sm text-muted">
                  {p.method} · {p.paymentReference}
                </span>
              ) : null}
            </Cell>
            <Cell>
              <span className="flex flex-wrap gap-2">
                {b.provider === 'MANUAL' && b.status === 'SENT' && p.status === 'CONFIRMED' ? (
                  <Button size="sm" onClick={() => setRecording(p)}>
                    Record payment
                  </Button>
                ) : null}
                {p.status === 'AWAITING_PARENT' || p.status === 'CONFIRMED' ? (
                  <Button size="sm" variant="ghost" onClick={() => setCancelling(p)}>
                    Take out
                  </Button>
                ) : null}
                {p.status === 'SENDING' && superAdmin ? (
                  <Button size="sm" variant="secondary" onClick={() => setSettling(p)}>
                    Settle
                  </Button>
                ) : null}
              </span>
            </Cell>
          </tr>
        ))}
      </Table>
      {recording ? (
        <Dialog open onClose={() => setRecording(null)} title={`Record ${recording.reference}`}>
          <form
            className="flex flex-col gap-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (
                await act(
                  () =>
                    api.POST('/v1/admin/hub/payouts/{id}/record', {
                      params: { path: { id: recording.id } },
                      body: { method: method.trim(), reference: reference.trim() },
                    }),
                  `${recording.reference} recorded as paid.`,
                )
              ) {
                setRecording(null);
                setReference('');
              }
            }}
          >
            <p>
              Pay <strong>{formatMoney(recording.netMinor, recording.currency)}</strong> to{' '}
              {recording.parentName} (•••• {recording.accountLast4}) first. “Show details” on Payout
              accounts reveals the full account (logged).
            </p>
            <TextField
              label="How"
              value={method}
              maxLength={60}
              onChange={(e) => setMethod(e.target.value)}
            />
            <TextField
              label="Bank or wallet reference"
              value={reference}
              maxLength={120}
              onChange={(e) => setReference(e.target.value)}
            />
            <div className="flex gap-2">
              <Button type="submit" loading={action.busy} disabled={reference.trim().length < 2}>
                Record as paid
              </Button>
              <Button variant="ghost" onClick={() => setRecording(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </Dialog>
      ) : null}
      {settling ? (
        <Dialog open onClose={() => setSettling(null)} title={`Settle ${settling.reference}`}>
          <form
            className="flex flex-col gap-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (
                await act(
                  () =>
                    api.POST('/v1/admin/hub/payouts/{id}/settle', {
                      params: { path: { id: settling.id } },
                      body: {
                        outcome,
                        ...(outcome === 'TRANSFER_FOUND' && transferId.trim()
                          ? { transferId: transferId.trim() }
                          : {}),
                        reason: reason.trim(),
                      },
                    }),
                  outcome === 'TRANSFER_FOUND'
                    ? `${settling.reference} is sent: Wise’s state follows.`
                    : `${settling.reference} failed: the money is payable again.`,
                )
              ) {
                setSettling(null);
                setReason('');
                setTransferId('');
              }
            }}
          >
            <p>
              Wise gave no clear answer for this payout. Look it up in Wise by its reference{' '}
              <strong>KCP{settling.reference.replace(/\D/g, '').replace(/^0+/, '')}</strong>, then
              say what you found. Only mark it as not sent if Wise has no transfer for it.
            </p>
            <SelectField
              label="In Wise"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as typeof outcome)}
            >
              <option value="TRANSFER_FOUND">There is a transfer for it</option>
              <option value="NO_TRANSFER">There is no transfer for it</option>
            </SelectField>
            {outcome === 'TRANSFER_FOUND' && !settling.providerTransferId ? (
              <TextField
                label="Wise transfer ID"
                value={transferId}
                inputMode="numeric"
                maxLength={20}
                onChange={(e) => setTransferId(e.target.value)}
              />
            ) : null}
            <TextField
              label="What you checked"
              value={reason}
              maxLength={300}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                variant={outcome === 'NO_TRANSFER' ? 'danger' : 'primary'}
                loading={action.busy}
                disabled={
                  reason.trim().length < 5 ||
                  (outcome === 'TRANSFER_FOUND' &&
                    !settling.providerTransferId &&
                    !/^\d+$/.test(transferId.trim()))
                }
              >
                Settle
              </Button>
              <Button variant="ghost" onClick={() => setSettling(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </Dialog>
      ) : null}
      {cancelling ? (
        <Dialog open onClose={() => setCancelling(null)} title={`Take ${cancelling.reference} out`}>
          <form
            className="flex flex-col gap-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (
                await act(
                  () =>
                    api.POST('/v1/admin/hub/payouts/{id}/cancel', {
                      params: { path: { id: cancelling.id } },
                      body: { reason: reason.trim() },
                    }),
                  `${cancelling.reference} taken out: the money stays payable.`,
                )
              ) {
                setCancelling(null);
                setReason('');
              }
            }}
          >
            <TextField
              label="Reason"
              value={reason}
              maxLength={300}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                variant="danger"
                loading={action.busy}
                disabled={reason.trim().length < 3}
              >
                Take out
              </Button>
              <Button variant="ghost" onClick={() => setCancelling(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </Dialog>
      ) : null}
    </HubPage>
  );
}

/** Admin → Hub → Payout accounts: checking new accounts with the parent. */
export function HubAccountsPage() {
  const [show, setShow] = useState<'waiting' | 'all'>('waiting');
  const data = useLoad(
    () => api.GET('/v1/admin/hub/payout-accounts', { params: { query: { show } } }),
    show,
  );
  const [revealed, setRevealed] = useState<{
    account: Account;
    details: components['schemas']['PayoutAccountDetailsDto'];
  } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const action = useAction();
  return (
    <HubPage
      title="Payout accounts"
      description="Parents’ accounts for their children’s earnings. Check each new one with the parent (through their registered email) before marking it checked. Showing the full details is logged."
    >
      <SelectField
        label="Show"
        value={show}
        onChange={(e) => setShow(e.target.value as 'waiting' | 'all')}
      >
        <option value="waiting">Waiting to be checked</option>
        <option value="all">All (newest first)</option>
      </SelectField>
      <div aria-live="polite">
        {notice ? <Alert tone="success">{notice}</Alert> : null}
        {action.error ? <Alert tone="error">{action.error}</Alert> : null}
      </div>
      {data.error ? <Alert tone="error">{data.error}</Alert> : null}
      {!data.data ? (
        <PageSpinner label="Loading" />
      ) : (
        <Table
          caption="Payout accounts"
          columns={['Parent', 'Account', 'Added', 'State', '']}
          empty={data.data.length === 0}
          emptyText="Nothing waiting."
        >
          {data.data.map((a) => (
            <tr key={a.id}>
              <Cell>
                {a.parentName}
                <span className="block text-sm text-muted">{a.parentEmail}</span>
              </Cell>
              <Cell>
                {a.holderName} · {a.kind} •••• {a.last4}
                <span className="block text-sm text-muted">
                  {a.currency} · {a.countryCode}
                </span>
              </Cell>
              <Cell>
                {formatDateTime(a.createdAt)}
                <span className="block text-sm text-muted">
                  usable from {formatDateTime(a.usableFrom)}
                </span>
              </Cell>
              <Cell>{a.removedAt ? <Badge>Removed</Badge> : <HubBadge status={a.state} />}</Cell>
              <Cell>
                <span className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      let details: components['schemas']['PayoutAccountDetailsDto'] | undefined;
                      if (
                        await action.run(async () => {
                          const result = await api.GET(
                            '/v1/admin/hub/payout-accounts/{id}/details',
                            { params: { path: { id: a.id } } },
                          );
                          details = result.data;
                          return result;
                        })
                      ) {
                        if (details) setRevealed({ account: a, details });
                      }
                    }}
                  >
                    Show details
                  </Button>
                  {!a.verifiedAt && !a.removedAt ? (
                    <Button
                      size="sm"
                      loading={action.busy}
                      onClick={async () => {
                        if (
                          await action.run(() =>
                            api.POST('/v1/admin/hub/payout-accounts/{id}/verify', {
                              params: { path: { id: a.id } },
                            }),
                          )
                        ) {
                          setNotice(`${a.parentName}’s account is checked.`);
                          data.reload();
                        }
                      }}
                    >
                      Mark checked
                    </Button>
                  ) : null}
                </span>
              </Cell>
            </tr>
          ))}
        </Table>
      )}
      {revealed ? (
        <Dialog open onClose={() => setRevealed(null)} title="Account details">
          <Details
            items={[
              ['Holder', revealed.details.holderName],
              ...(revealed.details.iban
                ? ([['IBAN', <code key="i">{revealed.details.iban}</code>]] as [
                    string,
                    ReactNode,
                  ][])
                : []),
              ...(revealed.details.details
                ? ([['Details', revealed.details.details]] as [string, string][])
                : []),
            ]}
          />
          <p className="text-sm text-muted">
            This look is in the audit log. Don’t copy the details anywhere else.
          </p>
          <Button variant="secondary" onClick={() => setRevealed(null)}>
            Close
          </Button>
        </Dialog>
      ) : null}
    </HubPage>
  );
}

/** Admin → Hub → Ledger: the trial balance and every posting. */
export function HubLedgerPage() {
  const [kind, setKind] = useState('');
  const [before, setBefore] = useState<string | undefined>(undefined);
  const balance = useLoad(() => api.GET('/v1/admin/hub/ledger/trial-balance'), 'tb');
  const rows = useLoad(
    () =>
      api.GET('/v1/admin/hub/ledger/transactions', {
        params: { query: { ...(kind ? { kind } : {}), ...(before ? { before } : {}) } },
      }),
    `${kind}|${before ?? ''}`,
  );
  return (
    <HubPage
      title="Ledger"
      description="The hub’s double-entry books. Every posting balances (debits equal credits); nothing is edited or deleted. Check the trial balance weekly against the bank and Stripe."
    >
      <Card title="Trial balance">
        {balance.error ? <Alert tone="error">{balance.error}</Alert> : null}
        {(balance.data ?? []).length === 0 ? <p className="text-muted">No postings yet.</p> : null}
        {(balance.data ?? []).map((c) => (
          <div key={c.currency} className="mb-4">
            <p className="font-bold">
              {c.currency}: debits {formatMoney(c.debits, c.currency)} · credits{' '}
              {formatMoney(c.credits, c.currency)}{' '}
              {c.debits === c.credits ? (
                <Badge tone="success">Balanced</Badge>
              ) : (
                <Badge tone="danger">Not balanced</Badge>
              )}
            </p>
            <ul className="mt-1 grid gap-1 text-sm sm:grid-cols-3">
              {Object.entries(c.accounts as Record<string, number>).map(([type, amount]) => (
                <li key={type}>
                  {type.replaceAll('_', ' ').toLowerCase()}:{' '}
                  <strong>{formatMoney(amount, c.currency)}</strong>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Card>
      <div className="flex flex-wrap items-end gap-3">
        <SelectField
          label="Kind"
          value={kind}
          onChange={(e) => {
            setKind(e.target.value);
            setBefore(undefined);
          }}
        >
          <option value="">All</option>
          {[
            'invoice.issued',
            'invoice.paid',
            'invoice.voided',
            'earnings.shared',
            'earnings.released',
            'payout.sent',
            'payout.paid',
            'payout.failed',
            'lead.paid',
          ].map((k) => (
            <option key={k}>{k}</option>
          ))}
        </SelectField>
      </div>
      {rows.error ? <Alert tone="error">{rows.error}</Alert> : null}
      {!rows.data ? (
        <PageSpinner label="Loading" />
      ) : (
        <>
          <Table
            caption="Postings"
            columns={['When', 'Kind', 'Memo', 'Entries']}
            empty={rows.data.length === 0}
            emptyText="No postings."
          >
            {rows.data.map((t) => (
              <tr key={t.id}>
                <Cell>{formatDateTime(t.createdAt)}</Cell>
                <Cell>{t.kind}</Cell>
                <Cell>{t.memo}</Cell>
                <Cell>
                  {t.entries.map((e, index) => (
                    <span key={index} className="block text-sm">
                      {e.side === 'DEBIT' ? 'Dr' : 'Cr'}{' '}
                      {e.accountType.replaceAll('_', ' ').toLowerCase()}
                      {e.owner ? ` (${e.owner.slice(-8)})` : ''}:{' '}
                      {formatMoney(e.amountMinor, t.currency)}
                    </span>
                  ))}
                </Cell>
              </tr>
            ))}
          </Table>
          {rows.data.length === 50 ? (
            <Button
              variant="secondary"
              className="self-start"
              onClick={() => setBefore(rows.data!.at(-1)!.createdAt)}
            >
              Older
            </Button>
          ) : null}
        </>
      )}
    </HubPage>
  );
}
