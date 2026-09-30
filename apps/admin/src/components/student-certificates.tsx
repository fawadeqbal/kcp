'use client';

import { Alert, Badge, Button, Card, Dialog, TextField } from '@kcp/ui';
import { type FormEvent, useState } from 'react';
import { useAction } from '@/lib/action';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { useLoad } from '@/lib/hooks';

/** WEB_APP_URL of the student app, where anyone can check a certificate's code. */
const WEB_APP_URL = process.env.NEXT_PUBLIC_WEB_APP_URL ?? 'http://localhost:3001';

/**
 * A student's certificates (one per finished module). Staff can revoke one, for
 * example when the work turned out to be copied: checking its code then says so.
 */
export function StudentCertificatesCard({
  userId,
  onDone,
}: {
  userId: string;
  onDone: (message: string) => void;
}) {
  const { state } = useAuth();
  const canRevoke = state.status === 'authenticated' && state.ability.can('update', 'Certificate');
  const list = useLoad(
    () => api.GET('/v1/admin/users/{id}/certificates', { params: { path: { id: userId } } }),
    `certificates|${userId}`,
  );
  const [revoking, setRevoking] = useState<{ id: string; code: string } | null>(null);

  return (
    <Card title="Certificates">
      {list.error ? (
        <p className="text-muted">{list.error}</p>
      ) : !list.data ? (
        <p className="text-muted">Loading…</p>
      ) : list.data.certificates.length === 0 ? (
        <p className="text-muted">None yet. A certificate comes with each finished module.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {list.data.certificates.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
              <div>
                <p className="font-semibold">{c.moduleTitle}</p>
                <p className="text-sm text-muted">
                  <a
                    href={`${WEB_APP_URL}/en/certificates/${c.code}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-latin text-brand-text underline-offset-4 hover:underline"
                  >
                    {c.code}
                  </a>{' '}
                  · {formatDate(c.issuedAt)}
                </p>
              </div>
              {c.revoked ? (
                <Badge tone="danger">Revoked</Badge>
              ) : canRevoke ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setRevoking({ id: c.id, code: c.code })}
                >
                  Revoke
                </Button>
              ) : (
                <Badge tone="success">Valid</Badge>
              )}
            </li>
          ))}
        </ul>
      )}
      {revoking ? (
        <RevokeDialog
          certificate={revoking}
          onClose={() => setRevoking(null)}
          onRevoked={() => {
            setRevoking(null);
            list.reload();
            onDone(`Certificate ${revoking.code} revoked.`);
          }}
        />
      ) : null}
    </Card>
  );
}

function RevokeDialog({
  certificate,
  onClose,
  onRevoked,
}: {
  certificate: { id: string; code: string };
  onClose: () => void;
  onRevoked: () => void;
}) {
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string>();
  const action = useAction();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (reason.trim().length < 3) {
      setReasonError('Write a short reason (at least 3 characters).');
      return;
    }
    const ok = await action.run(() =>
      api.POST('/v1/admin/certificates/{id}/revoke', {
        params: { path: { id: certificate.id } },
        body: { reason: reason.trim() },
      }),
    );
    if (ok) onRevoked();
  }

  return (
    <Dialog open onClose={onClose} title={`Revoke certificate ${certificate.code}?`}>
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <p className="text-muted">
          Anyone checking this code will see that it was revoked, and the PDF can no longer be
          downloaded. This can’t be undone.
        </p>
        <TextField
          label="Reason"
          hint="Required. Kept in the audit log."
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
            Revoke
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
