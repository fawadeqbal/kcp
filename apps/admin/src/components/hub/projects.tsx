'use client';

import type { components } from '@kcp/api-client-ts';
import {
  Alert,
  Badge,
  Button,
  Card,
  Dialog,
  PageSpinner,
  SelectField,
  TextField,
  textareaClass,
} from '@kcp/ui';
import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import { useAction } from '@/lib/action';
import { api } from '@/lib/api';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { Cell, Details, Table } from '../data';
import { HubBadge, HubPage, linkClass } from './hub-shell';

type Project = components['schemas']['AdminProjectDto'];
type Invoice = components['schemas']['HubInvoiceDto'];
type Status = Project['status'];
const STATUSES: (Status | '')[] = [
  '',
  'SCOPING',
  'QUOTED',
  'AWAITING_DEPOSIT',
  'ACTIVE',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
];

/** Admin → Hub → Projects. */
export function HubProjectsPage() {
  const [status, setStatus] = useState<Status | ''>('');
  const data = useLoad(
    () => api.GET('/v1/admin/hub/projects', { params: { query: status ? { status } : {} } }),
    status,
  );
  return (
    <HubPage title="Hub projects" description="Every client project, from scoping to completed.">
      <div className="flex flex-wrap items-end gap-3">
        <SelectField
          label="State"
          value={status}
          onChange={(e) => setStatus(e.target.value as Status | '')}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s ? s.replaceAll('_', ' ').toLowerCase() : 'All'}
            </option>
          ))}
        </SelectField>
      </div>
      {data.error ? <Alert tone="error">{data.error}</Alert> : null}
      {!data.data ? (
        <PageSpinner label="Loading" />
      ) : (
        <Table
          caption="Hub projects"
          columns={['Project', 'Client', 'Lead', 'Started', 'State']}
          empty={data.data.length === 0}
          emptyText="No projects."
        >
          {data.data.map((p) => (
            <tr key={p.id}>
              <Cell>
                <Link href={`/hub/projects/${p.id}`} className={linkClass}>
                  {p.reference} · {p.title}
                </Link>
              </Cell>
              <Cell>{p.clientName}</Cell>
              <Cell>{p.leadName ?? '—'}</Cell>
              <Cell>{formatDate(p.createdAt)}</Cell>
              <Cell>
                <HubBadge status={p.status} />
              </Cell>
            </tr>
          ))}
        </Table>
      )}
    </HubPage>
  );
}

function EditDialog({
  project,
  onClose,
  onDone,
}: {
  project: Project;
  onClose: () => void;
  onDone: () => void;
}) {
  const leads = useLoad(() => api.GET('/v1/admin/hub/leads'), 'leads');
  const [leadId, setLeadId] = useState(project.leadId ?? '');
  const [student, setStudent] = useState(String(project.split.student));
  const [lead, setLead] = useState(String(project.split.lead));
  const [platform, setPlatform] = useState(String(project.split.platform));
  const [deposit, setDeposit] = useState(String(project.depositPercent));
  const [reason, setReason] = useState('');
  const action = useAction();
  const quoted = project.quotes.some(
    (q) => q.kind === 'MAIN' && q.status !== 'DRAFT' && q.status !== 'WITHDRAWN',
  );
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (
      await action.run(() =>
        api.PATCH('/v1/admin/hub/projects/{id}', {
          params: { path: { id: project.id } },
          body: {
            ...(leadId && leadId !== project.leadId ? { leadId } : {}),
            ...(!quoted
              ? {
                  studentPercent: Number(student),
                  leadPercent: Number(lead),
                  platformPercent: Number(platform),
                  depositPercent: Number(deposit),
                }
              : {}),
            reason: reason.trim(),
          },
        }),
      )
    ) {
      onDone();
    }
  };
  return (
    <Dialog open onClose={onClose} title={`Edit ${project.reference}`}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        {action.error ? <Alert tone="error">{action.error}</Alert> : null}
        <SelectField
          label="Lead developer"
          value={leadId}
          onChange={(e) => setLeadId(e.target.value)}
        >
          <option value="">—</option>
          {(leads.data ?? []).map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} ({l.openProjects} open)
            </option>
          ))}
        </SelectField>
        {quoted ? (
          <p className="text-sm text-muted">
            The split and deposit are fixed once the main quote went to the client.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Students %"
              type="number"
              min={0}
              max={100}
              value={student}
              onChange={(e) => setStudent(e.target.value)}
            />
            <TextField
              label="Lead %"
              type="number"
              min={0}
              max={100}
              value={lead}
              onChange={(e) => setLead(e.target.value)}
            />
            <TextField
              label="Platform %"
              type="number"
              min={0}
              max={100}
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            />
            <TextField
              label="Deposit %"
              type="number"
              min={0}
              max={100}
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
            />
          </div>
        )}
        <TextField
          label="Reason"
          hint="Kept in the audit log."
          value={reason}
          maxLength={300}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex gap-2">
          <Button type="submit" loading={action.busy} disabled={reason.trim().length < 3}>
            Save
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function PaymentDialog({
  invoice,
  onClose,
  onDone,
}: {
  invoice: Invoice;
  onClose: () => void;
  onDone: () => void;
}) {
  const [method, setMethod] = useState('Bank transfer');
  const [reference, setReference] = useState('');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const action = useAction();
  return (
    <Dialog open onClose={onClose} title={`Record payment of ${invoice.reference}`}>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (
            await action.run(() =>
              api.POST('/v1/admin/hub/invoices/{id}/payments', {
                params: { path: { id: invoice.id } },
                body: {
                  method: method.trim(),
                  reference: reference.trim(),
                  paidAt: new Date(`${paidAt}T12:00:00Z`).toISOString(),
                },
              }),
            )
          ) {
            onDone();
          }
        }}
      >
        {action.error ? <Alert tone="error">{action.error}</Alert> : null}
        <p>
          The whole invoice: <strong>{formatMoney(invoice.amountMinor, invoice.currency)}</strong>.
          Check the bank statement first.
        </p>
        <TextField
          label="How"
          value={method}
          maxLength={60}
          onChange={(e) => setMethod(e.target.value)}
        />
        <TextField
          label="Bank reference"
          value={reference}
          maxLength={120}
          onChange={(e) => setReference(e.target.value)}
        />
        <TextField
          label="Paid on"
          type="date"
          value={paidAt}
          onChange={(e) => setPaidAt(e.target.value)}
        />
        <div className="flex gap-2">
          <Button type="submit" loading={action.busy} disabled={reference.trim().length < 2}>
            Record
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function ReasonDialog({
  title,
  label,
  confirm,
  onClose,
  call,
  onDone,
}: {
  title: string;
  label: string;
  confirm: string;
  onClose: () => void;
  call: (reason: string) => Promise<{ error?: unknown; response: Response }>;
  onDone: () => void;
}) {
  const [reason, setReason] = useState('');
  const action = useAction();
  return (
    <Dialog open onClose={onClose} title={title}>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (await action.run(() => call(reason.trim()))) onDone();
        }}
      >
        {action.error ? <Alert tone="error">{action.error}</Alert> : null}
        <TextField
          label={label}
          hint="Kept in the audit log."
          value={reason}
          maxLength={500}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex gap-2">
          <Button
            type="submit"
            variant="danger"
            loading={action.busy}
            disabled={reason.trim().length < 3}
          >
            {confirm}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/** One project for staff: everything, money included, and the staff actions. */
export function HubProjectDetail({ id }: { id: string }) {
  const data = useLoad(
    () => api.GET('/v1/admin/hub/projects/{id}', { params: { path: { id } } }),
    id,
  );
  const deliveries = useLoad(
    () => api.GET('/v1/admin/hub/projects/{id}/deliveries', { params: { path: { id } } }),
    `d${id}`,
  );
  const comments = useLoad(
    () => api.GET('/v1/admin/hub/projects/{id}/comments', { params: { path: { id } } }),
    `c${id}`,
  );
  const changes = useLoad(
    () => api.GET('/v1/admin/hub/projects/{id}/changes', { params: { path: { id } } }),
    `x${id}`,
  );
  const [dialog, setDialog] = useState<
    | { kind: 'edit' }
    | { kind: 'cancel' }
    | { kind: 'pay'; invoice: Invoice }
    | { kind: 'void'; invoice: Invoice }
    | null
  >(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const post = useAction();
  if (data.error) return <Alert tone="error">{data.error}</Alert>;
  if (!data.data) return <PageSpinner label="Loading" />;
  const p = data.data;
  const done = (text: string) => {
    setDialog(null);
    setNotice(text);
    data.reload();
  };
  return (
    <HubPage
      title={`${p.reference} · ${p.title}`}
      description={`${p.clientName} · lead ${p.leadName ?? '—'}`}
      actions={
        <span className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setDialog({ kind: 'edit' })}>
            Edit lead or split
          </Button>
          {p.status !== 'CANCELLED' && p.status !== 'COMPLETED' ? (
            <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: 'cancel' })}>
              Cancel project
            </Button>
          ) : null}
        </span>
      }
    >
      <div aria-live="polite">{notice ? <Alert tone="success">{notice}</Alert> : null}</div>
      <Card title="Project">
        <Details
          items={[
            ['State', <HubBadge key="s" status={p.status} />],
            [
              'Split',
              `students ${p.split.student}% · lead ${p.split.lead}% · platform ${p.split.platform}%`,
            ],
            ['Deposit', `${p.depositPercent}%`],
            ['Held for it (ledger)', formatMoney(p.fundsMinor, p.currency)],
            ['Portfolio allowed', p.portfolioAllowed ? 'Yes' : 'No'],
            ['Deadline', p.deadline ? formatDate(p.deadline) : '—'],
            ...(p.cancelReason
              ? ([['Cancelled because', p.cancelReason]] as [string, string][])
              : []),
          ]}
        />
        <p className="mt-4 whitespace-pre-line">{p.summary}</p>
        {p.intakeId ? (
          <p className="mt-2">
            <Link href={`/hub/requests/${p.intakeId}`} className={linkClass}>
              The original request
            </Link>
          </p>
        ) : null}
      </Card>
      {p.quotes.map((q) => (
        <Card
          key={q.id}
          title={`Quote ${q.version} (${q.kind === 'MAIN' ? 'main' : 'change'})`}
          actions={<HubBadge status={q.status} />}
        >
          <p>
            {formatMoney(q.priceMinor, p.currency)}
            {q.depositMinor ? ` · deposit ${formatMoney(q.depositMinor, p.currency)}` : ''}
            {q.acceptedAt ? ` · work accepted ${formatDate(q.acceptedAt)}` : ''}
            {q.approvedBy ? ` · approved by ${q.approvedBy}` : ''}
          </p>
          <Table
            bare
            caption={`Tasks of quote ${q.version}`}
            columns={['Task', 'Share', 'Estimate', 'Who', 'State']}
            empty={q.tasks.length === 0}
            emptyText="No tasks."
          >
            {q.tasks.map((task) => (
              <tr key={task.id}>
                <Cell>
                  {task.reference} · {task.title}
                </Cell>
                <Cell>{task.shareBp / 100}%</Cell>
                <Cell>{Math.round((task.estimateMinutes / 60) * 10) / 10} h</Cell>
                <Cell>
                  {task.assignee ? `${task.assignee.nickname} (${task.assignee.pseudonym})` : '—'}
                </Cell>
                <Cell>
                  <HubBadge status={task.status} />
                </Cell>
              </tr>
            ))}
          </Table>
        </Card>
      ))}
      <Card title="Invoices">
        <Table
          bare
          caption="Invoices"
          columns={['Invoice', 'Amount', 'Issued', 'State', '']}
          empty={p.invoices.length === 0}
          emptyText="No invoices yet."
        >
          {p.invoices.map((invoice) => (
            <tr key={invoice.id}>
              <Cell>
                {invoice.reference} · {invoice.kind === 'DEPOSIT' ? 'deposit' : 'final'}
                {invoice.payments.map((pay, index) => (
                  <span key={index} className="block text-sm text-muted">
                    {pay.provider === 'STRIPE' ? 'Card' : (pay.method ?? 'Manual')}{' '}
                    {pay.reference ? `· ${pay.reference}` : ''} · {formatDate(pay.paidAt)}
                  </span>
                ))}
                {invoice.voidReason ? (
                  <span className="block text-sm text-muted">Void: {invoice.voidReason}</span>
                ) : null}
              </Cell>
              <Cell>{formatMoney(invoice.amountMinor, invoice.currency)}</Cell>
              <Cell>{formatDate(invoice.issuedAt)}</Cell>
              <Cell>
                <HubBadge status={invoice.status} />
              </Cell>
              <Cell>
                {invoice.status === 'OPEN' ? (
                  <span className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setDialog({ kind: 'pay', invoice })}>
                      Record payment
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDialog({ kind: 'void', invoice })}
                    >
                      Void
                    </Button>
                  </span>
                ) : null}
              </Cell>
            </tr>
          ))}
        </Table>
      </Card>
      <Card title="Milestones">
        <Table
          bare
          caption="Milestones"
          columns={['Milestone', 'Shared', 'State', 'Client said']}
          empty={(deliveries.data ?? []).length === 0}
          emptyText="None yet."
        >
          {(deliveries.data ?? []).map((d) => (
            <tr key={d.id}>
              <Cell>
                {d.reference} · {d.title} {d.final ? <Badge tone="brand">Final</Badge> : null}
              </Cell>
              <Cell>{formatDateTime(d.submittedAt)}</Cell>
              <Cell>
                <HubBadge status={d.status} />
              </Cell>
              <Cell>{d.clientComment ?? '—'}</Cell>
            </tr>
          ))}
        </Table>
      </Card>
      <Card title="Messages with the client">
        <ol className="flex flex-col gap-2">
          {(comments.data ?? []).map((c) => (
            <li key={c.id} className="rounded-row bg-raised px-4 py-2.5">
              <p className="text-sm">
                <strong>{c.authorName}</strong> ({c.from}) · {formatDateTime(c.createdAt)}
              </p>
              <p className="whitespace-pre-line">{c.body}</p>
            </li>
          ))}
        </ol>
        <form
          className="mt-3 flex flex-col gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            if (
              await post.run(() =>
                api.POST('/v1/admin/hub/projects/{id}/comments', {
                  params: { path: { id } },
                  body: { body: message.trim() },
                }),
              )
            ) {
              setMessage('');
              comments.reload();
            }
          }}
        >
          {post.error ? <Alert tone="error">{post.error}</Alert> : null}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">
              Write as the platform team (the client is emailed)
            </span>
            <textarea
              className={textareaClass()}
              maxLength={3000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
          <Button
            type="submit"
            size="sm"
            className="self-start"
            loading={post.busy}
            disabled={!message.trim()}
          >
            Send
          </Button>
        </form>
      </Card>
      <Card title="Change requests">
        <Table
          bare
          caption="Change requests"
          columns={['Asked', 'State', 'Answer']}
          empty={(changes.data ?? []).length === 0}
          emptyText="None."
        >
          {(changes.data ?? []).map((c) => (
            <tr key={c.id}>
              <Cell>
                <span className="whitespace-pre-line">{c.body}</span>
                <span className="block text-sm text-muted">{formatDate(c.createdAt)}</span>
              </Cell>
              <Cell>
                <HubBadge status={c.status} />
              </Cell>
              <Cell>{c.note ?? '—'}</Cell>
            </tr>
          ))}
        </Table>
      </Card>
      {dialog?.kind === 'edit' ? (
        <EditDialog project={p} onClose={() => setDialog(null)} onDone={() => done('Saved.')} />
      ) : null}
      {dialog?.kind === 'pay' ? (
        <PaymentDialog
          invoice={dialog.invoice}
          onClose={() => setDialog(null)}
          onDone={() => done('Payment recorded.')}
        />
      ) : null}
      {dialog?.kind === 'void' ? (
        <ReasonDialog
          title={`Void ${dialog.invoice.reference}`}
          label="Why"
          confirm="Void the invoice"
          onClose={() => setDialog(null)}
          call={(reason) =>
            api.POST('/v1/admin/hub/invoices/{id}/void', {
              params: { path: { id: dialog.invoice.id } },
              body: { reason },
            })
          }
          onDone={() => done('Invoice voided.')}
        />
      ) : null}
      {dialog?.kind === 'cancel' ? (
        <ReasonDialog
          title={`Cancel ${p.reference}`}
          label="Why (the lead and client see the project as cancelled)"
          confirm="Cancel the project"
          onClose={() => setDialog(null)}
          call={(reason) =>
            api.POST('/v1/admin/hub/projects/{id}/cancel', {
              params: { path: { id } },
              body: { reason },
            })
          }
          onDone={() => done('Project cancelled.')}
        />
      ) : null}
    </HubPage>
  );
}
