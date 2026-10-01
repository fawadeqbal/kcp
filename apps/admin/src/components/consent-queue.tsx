'use client';

import type { components } from '@kcp/api-client-ts';
import { Alert, Badge, Button, Card, Dialog, PageSpinner, SelectField, TextField } from '@kcp/ui';
import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import { useAction } from '@/lib/action';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDateTime, humanize } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { Cell, Table } from './data';

type Request = components['schemas']['ConsentRequestAdminDto'];
type Status = NonNullable<Request['status']>;

const STATUSES: Status[] = ['SUBMITTED', 'PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED'];
const TONES: Record<Status, 'warning' | 'neutral' | 'success' | 'danger'> = {
  SUBMITTED: 'warning',
  PENDING: 'neutral',
  VERIFIED: 'success',
  REJECTED: 'danger',
  EXPIRED: 'neutral',
};
const LABELS: Record<Status, string> = {
  SUBMITTED: 'Form to check',
  PENDING: 'Waiting for the parent',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
};

/**
 * Verified parental consent for children under 13: signed forms parents uploaded,
 * to compare with the parent's account and approve or reject (with a reason the
 * parent reads). Forms are deleted 30 days after the decision.
 */
export function ConsentQueue() {
  const { state } = useAuth();
  const ability = state.status === 'authenticated' ? state.ability : null;
  const [status, setStatus] = useState<Status>('SUBMITTED');
  const [notice, setNotice] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<Request | null>(null);
  const list = useLoad(
    () => api.GET('/v1/admin/parental-consents', { params: { query: { status } } }),
    status,
  );
  if (!ability?.can('read', 'ParentalConsent')) return null;
  const canDecide = ability.can('update', 'ParentalConsent');
  const done = (message: string) => {
    setNotice(message);
    list.reload();
  };

  return (
    <Card
      title={`Under 13: verified consent${list.data ? ` (${list.data.waiting} to check)` : ''}`}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          Children under 13 stay closed until a parent confirms with a card check, “email plus”, or
          a signed form. Check that the form is signed and names the same parent and child as the
          account.
        </p>
        <div className="max-w-60">
          <SelectField
            label="Show"
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
          >
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {LABELS[value]}
              </option>
            ))}
          </SelectField>
        </div>
        {notice ? <Alert tone="success">{notice}</Alert> : null}
        {list.error ? <Alert tone="error">{list.error}</Alert> : null}
        {!list.data && !list.error ? <PageSpinner label="Loading" /> : null}
        {list.data ? (
          <Table
            bare
            caption="Parental consent requests"
            columns={['Child', 'Parent', 'Method', 'Status', 'Sent', '']}
            empty={list.data.items.length === 0}
            emptyText="Nothing here."
          >
            {list.data.items.map((request) => (
              <RequestRow
                key={request.id}
                request={request}
                canDecide={canDecide}
                onReject={() => setRejecting(request)}
                onDone={done}
              />
            ))}
          </Table>
        ) : null}
      </div>
      {rejecting ? (
        <RejectDialog
          request={rejecting}
          onClose={() => setRejecting(null)}
          onDone={(message) => {
            setRejecting(null);
            done(message);
          }}
        />
      ) : null}
    </Card>
  );
}

function RequestRow({
  request,
  canDecide,
  onReject,
  onDone,
}: {
  request: Request;
  canDecide: boolean;
  onReject: () => void;
  onDone: (message: string) => void;
}) {
  const action = useAction();
  const [downloading, setDownloading] = useState(false);

  async function download() {
    setDownloading(true);
    try {
      const { data } = await api.GET('/v1/admin/parental-consents/{id}/form', {
        params: { path: { id: request.id } },
        parseAs: 'blob',
      });
      if (!data) return;
      const url = URL.createObjectURL(data as Blob);
      const link = document.createElement('a');
      link.href = url;
      const type = (data as Blob).type;
      link.download = `consent-${request.nickname}.${type === 'application/pdf' ? 'pdf' : type === 'image/png' ? 'png' : 'jpg'}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <tr>
      <Cell>
        <Link
          href={`/users/${request.childId}`}
          className="font-semibold text-brand-text underline-offset-4 hover:underline"
        >
          {request.nickname}
        </Link>
        <span className="block text-xs text-muted">
          Born {request.birthYear} · {request.countryCode ?? '—'}
        </span>
      </Cell>
      <Cell>
        <Link
          href={`/users/${request.parentId}`}
          className="font-semibold text-brand-text underline-offset-4 hover:underline"
        >
          {request.parentName ?? request.parentEmail}
        </Link>
        <span className="block text-xs text-muted">{request.parentEmail}</span>
      </Cell>
      <Cell>{request.method ? humanize(request.method) : '—'}</Cell>
      <Cell>
        <Badge tone={TONES[request.status]}>{LABELS[request.status]}</Badge>
        {request.rejectReason ? (
          <span className="mt-1 block text-xs text-muted">{request.rejectReason}</span>
        ) : null}
        {request.decidedBy ? (
          <span className="mt-1 block text-xs text-muted">by {request.decidedBy}</span>
        ) : null}
      </Cell>
      <Cell className="whitespace-nowrap">
        {formatDateTime(request.submittedAt ?? request.createdAt)}
      </Cell>
      <Cell>
        <div className="flex flex-wrap gap-2">
          {request.hasForm ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void download()}
              loading={downloading}
            >
              Download form
            </Button>
          ) : null}
          {canDecide && request.status === 'SUBMITTED' ? (
            <>
              <Button
                size="sm"
                loading={action.busy}
                onClick={async () => {
                  const ok = await action.run(() =>
                    api.POST('/v1/admin/parental-consents/{id}/decision', {
                      params: { path: { id: request.id } },
                      body: { decision: 'APPROVE' },
                    }),
                  );
                  if (ok) onDone(`${request.nickname}'s account is open. The parent was emailed.`);
                }}
              >
                Approve
              </Button>
              <Button size="sm" variant="ghost" onClick={onReject}>
                Reject
              </Button>
            </>
          ) : null}
        </div>
        {action.error ? <p className="mt-1 text-sm text-danger">{action.error}</p> : null}
      </Cell>
    </tr>
  );
}

function RejectDialog({
  request,
  onClose,
  onDone,
}: {
  request: Request;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const action = useAction();
  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (reason.trim().length < 5) {
      setError('Write the reason for the parent (at least 5 characters).');
      return;
    }
    const ok = await action.run(() =>
      api.POST('/v1/admin/parental-consents/{id}/decision', {
        params: { path: { id: request.id } },
        body: { decision: 'REJECT', reason: reason.trim() },
      }),
    );
    if (ok) onDone(`The form for ${request.nickname} was rejected. The parent was emailed.`);
  }
  return (
    <Dialog open onClose={onClose} title={`Reject the form for ${request.nickname}`}>
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <TextField
          label="Reason (the parent reads it, in an email)"
          hint="For example: the form isn't signed, or names another child."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          error={error ?? undefined}
        />
        {action.error ? <Alert tone="error">{action.error}</Alert> : null}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={action.busy}>
            Reject the form
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
