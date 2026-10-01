'use client';

import type { components } from '@kcp/api-client-ts';
import {
  Alert,
  Badge,
  Button,
  Card,
  Dialog,
  Icon,
  PageSpinner,
  SelectField,
  TextField,
} from '@kcp/ui';
import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import { userSubject } from '@/lib/ability';
import { api } from '@/lib/api';
import { useAction } from '@/lib/action';
import { useAuth } from '@/lib/auth';
import { formatDate, formatDateTime, humanize } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { AuditEntries } from './audit-entries';
import { Details, StatusBadge } from './data';
import { PageHeader } from './shell';
import { FamilyBillingCard } from './family-billing';
import { StudentCertificatesCard } from './student-certificates';
import { StudentFriendsCard } from './student-friends';
import { StudentModerationCard } from './moderation';
import { StudentProgressCard } from './student-progress';

type User = components['schemas']['UserSummaryDto'];
type Person = components['schemas']['PersonRefDto'];
type Grant = components['schemas']['PremiumGrantDto'];
type Months = components['schemas']['GrantPremiumDto']['months'];

const CUSTOMER_ROLES = new Set(['parent', 'student']);

export function UserDetail({ id }: { id: string }) {
  const { state } = useAuth();
  const user = useLoad(() => api.GET('/v1/users/{id}', { params: { path: { id } } }), id);
  const family = useLoad(
    () => api.GET('/v1/admin/users/{id}/family', { params: { path: { id } } }),
    id,
  );
  const canReadAudit = state.status === 'authenticated' && state.ability.can('read', 'AuditLog');
  const history = useLoad(
    () =>
      canReadAudit
        ? api.GET('/v1/admin/audit-logs', { params: { query: { entityId: id, pageSize: 50 } } })
        : Promise.resolve({ data: undefined, error: undefined, response: new Response() }),
    `${id}:${canReadAudit}`,
  );
  const [notice, setNotice] = useState<string | null>(null);

  if (user.error) {
    return (
      <>
        <PageHeader title="User" />
        <Alert tone="error">{user.error}</Alert>
      </>
    );
  }
  if (!user.data || state.status !== 'authenticated') return <PageSpinner label="Loading" />;

  const account = user.data;
  const isStudent = account.kind === 'STUDENT';
  const isSelf = account.id === state.user.id;
  const target = userSubject(account);
  const canChangeStatus =
    !isSelf && account.status !== 'DELETED' && state.ability.can('update', target, 'status');
  const canSignOut = !isSelf && state.ability.can('update', target, 'sessions');
  const showPremium =
    CUSTOMER_ROLES.has(account.role.key) && state.ability.can('read', 'PremiumGrant');
  const showProgress = isStudent && state.ability.can('read', 'XpAdjustment');
  const showCertificates = isStudent && state.ability.can('read', 'Certificate');
  const showFriends = isStudent && state.ability.can('read', 'Friendship');
  const showModeration = isStudent && state.ability.can('read', 'Moderation');
  const showBilling = account.role.key === 'parent' && state.ability.can('read', 'Payment');

  const done = (message: string) => {
    setNotice(message);
    user.reload();
    history.reload();
  };

  return (
    <>
      <nav aria-label="Breadcrumb">
        <Link
          href="/users"
          className="flex min-h-9 w-fit items-center gap-1.5 rounded-full bg-surface ps-2.5 pe-3.5 text-sm font-semibold hover:bg-sand-300"
        >
          <Icon name="chevL" className="text-base" />
          Users
        </Link>
      </nav>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {account.displayName ?? '(no name)'}
            <StatusBadge status={account.status} />
          </span>
        }
        description={
          isStudent
            ? 'Student account, managed by their parent. Staff see the nickname and username only.'
            : undefined
        }
      />
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card title="Account">
          <Details
            items={[
              [isStudent ? 'Username' : 'Email', account.email ?? account.username ?? '—'],
              [isStudent ? 'Nickname' : 'Name', account.displayName ?? '—'],
              ['Role', account.role.name],
              ['Status', humanize(account.status)],
              ['Country', account.countryCode ?? '—'],
              ['Joined', formatDateTime(account.createdAt)],
              ['Last login', formatDateTime(account.lastLoginAt)],
              [
                'Account ID',
                <code key="id" className="font-latin text-sm break-all">
                  {account.id}
                </code>,
              ],
            ]}
          />
        </Card>
        <div className="flex flex-col gap-6">
          {canChangeStatus || canSignOut ? (
            <Card title="Actions">
              <div className="flex flex-col items-start gap-3">
                {canChangeStatus ? <StatusAction user={account} onDone={done} /> : null}
                {canSignOut ? <SignOutAction user={account} onDone={done} /> : null}
              </div>
            </Card>
          ) : null}
          {showPremium ? <PremiumCard account={account} onDone={done} /> : null}
          {showProgress ? <StudentProgressCard userId={account.id} onDone={done} /> : null}
          {showCertificates ? <StudentCertificatesCard userId={account.id} onDone={done} /> : null}
          {showFriends ? <StudentFriendsCard userId={account.id} onDone={done} /> : null}
          {showModeration ? <StudentModerationCard userId={account.id} onDone={done} /> : null}
          {showBilling ? <FamilyBillingCard parentId={account.id} onDone={done} /> : null}
          <Card title="Family">
            {family.data ? (
              <FamilyList parents={family.data.parents} childAccounts={family.data.children} />
            ) : family.error ? (
              <p className="text-muted">{family.error}</p>
            ) : (
              <p className="text-muted">Loading…</p>
            )}
          </Card>
        </div>
      </div>

      {canReadAudit ? (
        <Card title="History">
          {history.data ? (
            <AuditEntries
              entries={history.data.items}
              caption="Audit entries about this account"
              showEntity={false}
              bare
            />
          ) : (
            <p className="text-muted">{history.error ?? 'Loading…'}</p>
          )}
          {!CUSTOMER_ROLES.has(account.role.key) ? (
            <p className="mt-4 text-sm">
              <Link
                href={`/audit?actorId=${account.id}`}
                className="font-semibold text-brand-text underline-offset-4 hover:underline"
              >
                Actions taken by this staff member
              </Link>
            </p>
          ) : null}
        </Card>
      ) : null}
    </>
  );
}

function FamilyList({ parents, childAccounts }: { parents: Person[]; childAccounts: Person[] }) {
  if (!parents.length && !childAccounts.length) {
    return <p className="text-muted">No linked accounts.</p>;
  }
  const item = (person: Person, label: string) => (
    <li key={person.id} className="flex flex-wrap items-center gap-2">
      <Badge>{label}</Badge>
      <Link
        href={`/users/${person.id}`}
        className="font-semibold break-all text-brand-text underline-offset-4 hover:underline"
      >
        {person.displayName ?? person.email ?? person.username}
      </Link>
      <span className="text-sm break-all text-muted">{person.email ?? person.username}</span>
    </li>
  );
  return (
    <ul className="flex flex-col gap-3">
      {parents.map((p) => item(p, 'Parent'))}
      {childAccounts.map((c) => item(c, 'Child'))}
    </ul>
  );
}

function StatusAction({ user, onDone }: { user: User; onDone: (message: string) => void }) {
  const suspending = user.status !== 'SUSPENDED';
  const verb = suspending ? 'Suspend' : 'Reactivate';
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string>();
  const action = useAction();

  function close() {
    setOpen(false);
    setReason('');
    setReasonError(undefined);
    action.clear();
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (reason.trim().length < 3) {
      setReasonError('Write a short reason (at least 3 characters).');
      return;
    }
    const ok = await action.run(() =>
      api.PATCH('/v1/users/{id}/status', {
        params: { path: { id: user.id } },
        body: { status: suspending ? 'SUSPENDED' : 'ACTIVE', reason: reason.trim() },
      }),
    );
    if (ok) {
      close();
      onDone(suspending ? 'Account suspended and signed out everywhere.' : 'Account reactivated.');
    }
  }

  return (
    <>
      <Button variant={suspending ? 'danger' : 'secondary'} onClick={() => setOpen(true)}>
        {verb} account
      </Button>
      <Dialog open={open} onClose={close} title={`${verb} ${user.displayName ?? 'this account'}?`}>
        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <p className="text-muted">
            {suspending
              ? 'They’re signed out everywhere and can’t log in until an admin reactivates the account.'
              : 'They’ll be able to log in again.'}
          </p>
          <TextField
            label="Reason"
            hint="Kept in the audit log."
            value={reason}
            maxLength={500}
            onChange={(e) => setReason(e.target.value)}
            error={reasonError}
          />
          {action.error ? <Alert tone="error">{action.error}</Alert> : null}
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" variant={suspending ? 'danger' : 'primary'} loading={action.busy}>
              {verb}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

function SignOutAction({ user, onDone }: { user: User; onDone: (message: string) => void }) {
  const [open, setOpen] = useState(false);
  const action = useAction();

  async function confirm() {
    const ok = await action.run(() =>
      api.POST('/v1/users/{id}/sessions/revoke', { params: { path: { id: user.id } } }),
    );
    if (ok) {
      setOpen(false);
      onDone('Signed out on every device.');
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Sign out everywhere
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          action.clear();
        }}
        title="Sign out everywhere?"
      >
        <p className="text-muted">
          Ends every session of {user.displayName ?? 'this account'}. They can log in again straight
          away — use this when a device was lost or a password may have leaked.
        </p>
        {action.error ? <Alert tone="error">{action.error}</Alert> : null}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={confirm} loading={action.busy}>
            Sign out everywhere
          </Button>
        </div>
      </Dialog>
    </>
  );
}

const MONTHS = [1, 3, 6, 12] as const satisfies Months[];

function grantState(grant: Grant): { label: string; tone: 'success' | 'neutral' | 'danger' } {
  if (grant.revokedAt) return { label: 'Revoked', tone: 'danger' };
  if (grant.active) return { label: 'Active', tone: 'success' };
  return {
    label: new Date(grant.startsAt) > new Date() ? 'Not started' : 'Ended',
    tone: 'neutral',
  };
}

/**
 * Premium by hand for pilot families, until payments arrive. On a parent's page it
 * covers every child; each grant can be revoked on its own. Always with a reason.
 */
function PremiumCard({ account, onDone }: { account: User; onDone: (message: string) => void }) {
  const { state } = useAuth();
  const premium = useLoad(
    () => api.GET('/v1/admin/users/{id}/premium', { params: { path: { id: account.id } } }),
    account.id,
  );
  const [months, setMonths] = useState<Months>(3);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string>();
  const [revoking, setRevoking] = useState<Grant | null>(null);
  const action = useAction();
  const isParent = account.kind !== 'STUDENT';
  const ability = state.status === 'authenticated' ? state.ability : null;
  const canGrant =
    account.status !== 'DELETED' && (ability?.can('create', 'PremiumGrant') ?? false);
  const canRevoke = ability?.can('update', 'PremiumGrant') ?? false;

  async function grant(event: FormEvent) {
    event.preventDefault();
    if (reason.trim().length < 3) {
      setReasonError('Write a short reason (at least 3 characters).');
      return;
    }
    setReasonError(undefined);
    const ok = await action.run(() =>
      api.POST('/v1/admin/users/{id}/premium', {
        params: { path: { id: account.id } },
        body: { months, reason: reason.trim() },
      }),
    );
    if (ok) {
      setReason('');
      premium.reload();
      onDone(
        `Premium granted for ${months} ${months === 1 ? 'month' : 'months'}${isParent ? ' to every child' : ''}.`,
      );
    }
  }

  return (
    <Card title="Premium">
      <div className="flex flex-col gap-4">
        {premium.error ? <p className="text-muted">{premium.error}</p> : null}
        {premium.data ? (
          premium.data.grants.length === 0 ? (
            <p className="text-muted">No premium yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {premium.data.grants.map((item) => {
                const itemState = grantState(item);
                return (
                  <li key={item.id} className="flex flex-col gap-1 border-b border-line pb-3">
                    <span className="flex flex-wrap items-center gap-2">
                      <Badge tone={itemState.tone}>{itemState.label}</Badge>
                      {isParent ? (
                        <span className="font-semibold">
                          {item.studentNickname ?? 'Deleted child'}
                        </span>
                      ) : null}
                      <span className="text-sm">
                        {formatDate(item.startsAt)} – {formatDate(item.endsAt)}
                      </span>
                    </span>
                    <span className="text-sm break-words text-muted">
                      {item.reason} · by {item.grantedBy ?? 'unknown'}
                    </span>
                    {canRevoke && !item.revokedAt && new Date(item.endsAt) > new Date() ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="self-start"
                        onClick={() => setRevoking(item)}
                      >
                        Revoke
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )
        ) : premium.error ? null : (
          <p className="text-muted">Loading…</p>
        )}

        {canGrant ? (
          <form className="flex flex-col gap-3" onSubmit={grant} noValidate>
            <SelectField
              label="Length"
              value={String(months)}
              onChange={(e) => setMonths(Number(e.target.value) as Months)}
            >
              {MONTHS.map((m) => (
                <option key={m} value={String(m)}>
                  {m} {m === 1 ? 'month' : 'months'}
                </option>
              ))}
            </SelectField>
            <TextField
              label="Reason"
              hint="Kept in the audit log, e.g. “Pilot family from the Lahore school”."
              value={reason}
              maxLength={300}
              onChange={(e) => setReason(e.target.value)}
              error={reasonError}
            />
            {action.error && !revoking ? <Alert tone="error">{action.error}</Alert> : null}
            <Button type="submit" className="self-start" loading={action.busy && !revoking}>
              {isParent ? 'Grant premium to every child' : 'Grant premium'}
            </Button>
          </form>
        ) : null}
      </div>
      {revoking ? (
        <RevokeDialog
          grant={revoking}
          onClose={() => {
            setRevoking(null);
            action.clear();
          }}
          onRevoked={() => {
            setRevoking(null);
            premium.reload();
            onDone('Premium revoked.');
          }}
        />
      ) : null}
    </Card>
  );
}

function RevokeDialog({
  grant,
  onClose,
  onRevoked,
}: {
  grant: Grant;
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
      api.POST('/v1/admin/premium/{grantId}/revoke', {
        params: { path: { grantId: grant.id } },
        body: { reason: reason.trim() },
      }),
    );
    if (ok) onRevoked();
  }

  return (
    <Dialog open onClose={onClose} title="Revoke premium?">
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <p className="text-muted">
          {grant.studentNickname ?? 'This child'} loses premium straight away. Other grants stay.
        </p>
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
            Revoke
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
