'use client';

import type { components } from '@kcp/api-client-ts';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Dialog,
  PageSpinner,
  SelectField,
  TextField,
} from '@kcp/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { useAction } from '@/lib/action';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { Cell, Details, Table } from '../data';
import { HubBadge, HubPage, linkClass } from './hub-shell';

type Intake = components['schemas']['AdminIntakeDto'];
type Status = NonNullable<Intake['status']>;

const STATUSES: Status[] = ['NEW', 'UNCONFIRMED', 'ACCEPTED', 'DECLINED'];
const CURRENCIES = ['USD', 'PKR', 'EGP', 'AED', 'SAR'] as const;
const BUDGET: Record<Intake['budget'], string> = {
  UNDER_500: 'Under $500',
  FROM_500: '$500 – $2,000',
  FROM_2000: '$2,000 – $5,000',
  FROM_5000: 'Over $5,000',
  UNSURE: 'Not sure',
};

/** Admin → Hub → Requests: the queue of project requests. */
export function HubRequestsPage() {
  const [status, setStatus] = useState<Status>('NEW');
  const data = useLoad(
    () => api.GET('/v1/admin/hub/intakes', { params: { query: { status } } }),
    status,
  );
  return (
    <HubPage
      title="Hub"
      description="Paid client projects for students aged 15 and up. Requests from the site (once the client confirmed their email) and from clients’ portals wait here."
    >
      <div className="flex flex-wrap items-end gap-3">
        <SelectField
          label="Show"
          value={status}
          onChange={(e) => setStatus(e.target.value as Status)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === 'NEW'
                ? 'Waiting'
                : s === 'UNCONFIRMED'
                  ? 'Email not confirmed'
                  : s === 'ACCEPTED'
                    ? 'Accepted'
                    : 'Declined'}
            </option>
          ))}
        </SelectField>
      </div>
      {data.error ? <Alert tone="error">{data.error}</Alert> : null}
      {!data.data ? (
        <PageSpinner label="Loading" />
      ) : (
        <Table
          caption="Project requests"
          columns={['Request', 'From', 'Budget', 'Received', 'State']}
          empty={data.data.length === 0}
          emptyText="Nothing here."
        >
          {data.data.map((intake) => (
            <tr key={intake.id}>
              <Cell>
                <Link href={`/hub/requests/${intake.id}`} className={linkClass}>
                  {intake.reference} · {intake.title}
                </Link>
                <span className="block text-sm text-muted">
                  {intake.source === 'SITE' ? 'Website' : 'Client portal'}
                </span>
              </Cell>
              <Cell>
                {intake.company}
                <span className="block text-sm text-muted">
                  {intake.contactName} · {intake.countryCode ?? '—'}
                </span>
              </Cell>
              <Cell>{BUDGET[intake.budget]}</Cell>
              <Cell>{formatDate(intake.createdAt)}</Cell>
              <Cell>
                <HubBadge status={intake.status} />
              </Cell>
            </tr>
          ))}
        </Table>
      )}
    </HubPage>
  );
}

function AcceptDialog({ intake, onClose }: { intake: Intake; onClose: () => void }) {
  const router = useRouter();
  const leads = useLoad(() => api.GET('/v1/admin/hub/leads'), 'leads');
  const clients = useLoad(() => api.GET('/v1/admin/hub/clients'), 'clients');
  const [leadId, setLeadId] = useState('');
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>('USD');
  const [title, setTitle] = useState(intake.title);
  const [orgId, setOrgId] = useState(intake.orgId ?? '');
  const [newOrg, setNewOrg] = useState(!intake.orgId);
  const [orgName, setOrgName] = useState(intake.company);
  const [countryCode, setCountryCode] = useState(intake.countryCode ?? 'PK');
  const [deposit, setDeposit] = useState('30');
  const action = useAction();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    let projectId: string | undefined;
    const ok = await action.run(async () => {
      const result = await api.POST('/v1/admin/hub/intakes/{id}/accept', {
        params: { path: { id: intake.id } },
        body: {
          leadId,
          currency,
          title: title.trim(),
          depositPercent: Number(deposit),
          ...(newOrg ? { orgName: orgName.trim(), countryCode } : { orgId }),
        },
      });
      projectId = result.data?.projectId;
      return result;
    });
    if (ok && projectId) router.push(`/hub/projects/${projectId}`);
  };
  return (
    <Dialog open onClose={onClose} title={`Accept ${intake.reference}`}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        {action.error ? <Alert tone="error">{action.error}</Alert> : null}
        <TextField
          label="Project title"
          value={title}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
        />
        <SelectField
          label="Lead developer"
          value={leadId}
          required
          onChange={(e) => setLeadId(e.target.value)}
        >
          <option value="">Choose…</option>
          {(leads.data ?? []).map((lead) => (
            <option key={lead.id} value={lead.id}>
              {lead.name} ({lead.openProjects} open)
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value as typeof currency)}
        >
          {CURRENCIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </SelectField>
        <TextField
          label="Deposit (%)"
          type="number"
          min={0}
          max={100}
          value={deposit}
          onChange={(e) => setDeposit(e.target.value)}
        />
        <Checkbox
          label="A new client organisation (the contact is invited as its owner)"
          checked={newOrg}
          onChange={(e) => setNewOrg(e.target.checked)}
        />
        {newOrg ? (
          <>
            <TextField
              label="Organisation"
              value={orgName}
              maxLength={120}
              onChange={(e) => setOrgName(e.target.value)}
            />
            <TextField
              label="Country (2 letters)"
              value={countryCode}
              maxLength={2}
              onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
            />
          </>
        ) : (
          <SelectField
            label="Client"
            value={orgId}
            required
            onChange={(e) => setOrgId(e.target.value)}
          >
            <option value="">Choose…</option>
            {(clients.data ?? []).map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </SelectField>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={action.busy} disabled={!leadId}>
            Accept and make the project
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/** One request: the brief, its files, and accepting (with a lead) or declining it. */
export function HubRequestDetail({ id }: { id: string }) {
  const data = useLoad(
    () => api.GET('/v1/admin/hub/intakes/{id}', { params: { path: { id } } }),
    id,
  );
  const [dialog, setDialog] = useState<'accept' | 'decline' | null>(null);
  const [reason, setReason] = useState('');
  const decline = useAction();
  if (data.error) return <Alert tone="error">{data.error}</Alert>;
  if (!data.data) return <PageSpinner label="Loading" />;
  const intake = data.data;
  const download = async (fileId: string, name: string) => {
    const { data: blob } = await api.GET('/v1/admin/hub/intakes/{id}/files/{fileId}', {
      params: { path: { id, fileId } },
      parseAs: 'blob',
    });
    if (!blob) return;
    const url = URL.createObjectURL(blob as Blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };
  return (
    <HubPage
      title={`${intake.reference} · ${intake.title}`}
      description={`${intake.company} · ${intake.source === 'SITE' ? 'from the website' : 'from the client portal'}`}
      actions={
        intake.status === 'NEW' ? (
          <span className="flex gap-2">
            <Button size="sm" onClick={() => setDialog('accept')}>
              Accept
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setDialog('decline')}>
              Decline
            </Button>
          </span>
        ) : null
      }
    >
      <Card title="The request">
        <Details
          items={[
            ['State', <HubBadge key="s" status={intake.status} />],
            ['Contact', `${intake.contactName} · ${intake.contactEmail}`],
            ['Country, language', `${intake.countryCode ?? '—'}, ${intake.languageCode}`],
            ['Budget', BUDGET[intake.budget]],
            ['Wanted by', intake.deadline ? formatDate(intake.deadline) : '—'],
            ['Received', formatDate(intake.createdAt)],
            ['Client', intake.orgName ?? 'New'],
            [
              'Decided',
              intake.decidedAt
                ? `${formatDate(intake.decidedAt)} by ${intake.decidedBy ?? '—'}`
                : '—',
            ],
            ...(intake.declineReason
              ? ([['Reason', intake.declineReason]] as [string, string][])
              : []),
          ]}
        />
        <p className="mt-4 whitespace-pre-line">{intake.brief}</p>
        {intake.projectId ? (
          <p className="mt-3">
            <Link href={`/hub/projects/${intake.projectId}`} className={linkClass}>
              Open the project
            </Link>
          </p>
        ) : null}
      </Card>
      <Card title="Files">
        {intake.files.length === 0 ? <p className="text-muted">No files.</p> : null}
        <ul className="flex flex-col gap-1.5">
          {intake.files.map((file) => (
            <li key={file.id}>
              <button
                type="button"
                className={linkClass}
                onClick={() => void download(file.id, file.name)}
              >
                {file.name}
              </button>{' '}
              <span className="text-sm text-muted">
                {file.type}, {Math.ceil(file.size / 1024)} KB
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">
          Files are the client’s: download only to read them, and delete local copies after.
        </p>
      </Card>
      {dialog === 'accept' ? (
        <AcceptDialog intake={intake} onClose={() => setDialog(null)} />
      ) : null}
      {dialog === 'decline' ? (
        <Dialog open onClose={() => setDialog(null)} title={`Decline ${intake.reference}`}>
          <form
            className="flex flex-col gap-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (
                await decline.run(() =>
                  api.POST('/v1/admin/hub/intakes/{id}/decline', {
                    params: { path: { id } },
                    body: { reason: reason.trim() },
                  }),
                )
              ) {
                setDialog(null);
                data.reload();
              }
            }}
          >
            {decline.error ? <Alert tone="error">{decline.error}</Alert> : null}
            <TextField
              label="Reason (emailed to the client)"
              hint="Kind and short, e.g. “Trading tools handle people’s money: not something our students can build.”"
              value={reason}
              maxLength={500}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                variant="danger"
                loading={decline.busy}
                disabled={reason.trim().length < 5}
              >
                Decline
              </Button>
              <Button variant="ghost" onClick={() => setDialog(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </Dialog>
      ) : null}
    </HubPage>
  );
}
