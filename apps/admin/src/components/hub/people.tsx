'use client';

import type { components } from '@kcp/api-client-ts';
import { Alert, Badge, Button, Dialog, PageSpinner, SelectField, TextField } from '@kcp/ui';
import { useState } from 'react';
import { useAction } from '@/lib/action';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { Cell, Table } from '../data';
import { HubPage } from './hub-shell';

type Student = components['schemas']['HubStudentAdminDto'];
const STEP_NAMES: Record<string, string> = {
  AGE: 'Age',
  PRO_TRACK: 'Pro track',
  READINESS: 'Readiness',
  SIGN_OFF: 'Sign-off',
  PARENT_CONSENT: 'Parent',
  PREMIUM: 'Premium',
  COUNTRY: 'Country open',
};

/** Admin → Hub → Students: each student's way in, pausing and resuming hub work. */
export function HubStudentsPage() {
  const [status, setStatus] = useState<'eligible' | 'waiting' | 'paused' | ''>('');
  const data = useLoad(
    () => api.GET('/v1/admin/hub/students', { params: { query: status ? { status } : {} } }),
    status,
  );
  const [pausing, setPausing] = useState<Student | null>(null);
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const action = useAction();
  return (
    <HubPage
      title="Hub students"
      description="Students who passed the readiness check, and their steps into paid work. Pausing stops their timer and takes them off every project; the parent is told."
    >
      <SelectField
        label="Show"
        value={status}
        onChange={(e) => setStatus(e.target.value as typeof status)}
      >
        <option value="">All</option>
        <option value="eligible">Ready for projects</option>
        <option value="waiting">Not ready yet</option>
        <option value="paused">Paused</option>
      </SelectField>
      <div aria-live="polite">{notice ? <Alert tone="success">{notice}</Alert> : null}</div>
      {action.error ? <Alert tone="error">{action.error}</Alert> : null}
      {data.error ? <Alert tone="error">{data.error}</Alert> : null}
      {!data.data ? (
        <PageSpinner label="Loading" />
      ) : (
        <Table
          caption="Hub students"
          columns={['Student', 'Steps', 'Signed off', 'State', '']}
          empty={data.data.length === 0}
          emptyText="Nobody yet."
        >
          {data.data.map((s) => (
            <tr key={s.studentId}>
              <Cell>
                <span className="font-semibold">{s.nickname}</span>
                <span className="block text-sm text-muted">
                  {s.username} · {s.countryCode ?? '—'}
                </span>
              </Cell>
              <Cell>
                <span className="flex flex-wrap gap-1">
                  {s.eligibility.steps.map((step) => (
                    <Badge key={step.key} tone={step.done ? 'success' : 'neutral'}>
                      {STEP_NAMES[step.key] ?? step.key}
                    </Badge>
                  ))}
                </span>
              </Cell>
              <Cell>
                {s.signedOffAt ? `${formatDate(s.signedOffAt)} by ${s.signedOffBy ?? '—'}` : '—'}
                {s.signOffNote ? (
                  <span className="block text-sm text-muted">{s.signOffNote}</span>
                ) : null}
              </Cell>
              <Cell>
                {s.eligibility.paused ? (
                  <>
                    <Badge tone="warning">Paused</Badge>
                    {s.pausedReason ? (
                      <span className="block text-sm text-muted">{s.pausedReason}</span>
                    ) : null}
                  </>
                ) : s.eligibility.eligible ? (
                  <Badge tone="success">Ready</Badge>
                ) : (
                  <Badge>Not ready</Badge>
                )}
              </Cell>
              <Cell>
                {s.eligibility.paused ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={action.busy}
                    onClick={async () => {
                      if (
                        await action.run(() =>
                          api.POST('/v1/admin/hub/students/{studentId}/resume', {
                            params: { path: { studentId: s.studentId } },
                          }),
                        )
                      ) {
                        setNotice(`${s.nickname}’s hub work is resumed.`);
                        data.reload();
                      }
                    }}
                  >
                    Resume
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setPausing(s)}>
                    Pause
                  </Button>
                )}
              </Cell>
            </tr>
          ))}
        </Table>
      )}
      {pausing ? (
        <Dialog
          open
          onClose={() => setPausing(null)}
          title={`Pause ${pausing.nickname}’s hub work`}
        >
          <form
            className="flex flex-col gap-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (
                await action.run(() =>
                  api.POST('/v1/admin/hub/students/{studentId}/pause', {
                    params: { path: { studentId: pausing.studentId } },
                    body: { reason: reason.trim() },
                  }),
                )
              ) {
                setNotice(`${pausing.nickname}’s hub work is paused.`);
                setPausing(null);
                setReason('');
                data.reload();
              }
            }}
          >
            {action.error ? <Alert tone="error">{action.error}</Alert> : null}
            <TextField
              label="Reason (the parent sees it)"
              value={reason}
              maxLength={500}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                variant="danger"
                loading={action.busy}
                disabled={reason.trim().length < 5}
              >
                Pause
              </Button>
              <Button variant="ghost" onClick={() => setPausing(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </Dialog>
      ) : null}
    </HubPage>
  );
}

/** Admin → Hub → Clients. */
export function HubClientsPage() {
  const data = useLoad(() => api.GET('/v1/admin/hub/clients'), 'clients');
  return (
    <HubPage
      title="Hub clients"
      description="Businesses with a client account. Their people sign in to the client portal with two-factor codes."
    >
      {data.error ? <Alert tone="error">{data.error}</Alert> : null}
      {!data.data ? (
        <PageSpinner label="Loading" />
      ) : (
        <Table
          caption="Clients"
          columns={['Client', 'People', 'Agreement', 'Projects', 'Requests']}
          empty={data.data.length === 0}
          emptyText="No clients yet."
        >
          {data.data.map((c) => (
            <tr key={c.id}>
              <Cell>
                <span className="font-semibold">{c.name}</span>
                <span className="block text-sm text-muted">
                  {c.countryCode} · since {formatDate(c.createdAt)}
                </span>
              </Cell>
              <Cell>
                {c.people.map((person) => (
                  <span key={person.id} className="block text-sm">
                    {person.name} · {person.email} {person.role === 'OWNER' ? '(owner)' : ''}{' '}
                    {person.invited ? '(invited)' : ''}
                  </span>
                ))}
              </Cell>
              <Cell>
                {c.contract ? (
                  `v${c.contract.version}, ${formatDate(c.contract.signedAt)}`
                ) : (
                  <Badge tone="warning">Not signed</Badge>
                )}
              </Cell>
              <Cell>{c.projects}</Cell>
              <Cell>{c.intakes}</Cell>
            </tr>
          ))}
        </Table>
      )}
    </HubPage>
  );
}
