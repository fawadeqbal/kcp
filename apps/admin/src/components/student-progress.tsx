'use client';

import type { components } from '@kcp/api-client-ts';
import { BADGES } from '@kcp/shared';
import { Alert, Badge, Button, Card, Dialog, TextField } from '@kcp/ui';
import { type FormEvent, useState } from 'react';
import { useAction } from '@/lib/action';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDateTime, humanize } from '@/lib/format';
import { useLoad } from '@/lib/hooks';

type StudentXp = components['schemas']['StudentXpDto'];

const MANUAL_BADGES = BADGES.filter((b) => b.criteria.type === 'manual');
const iconOf = (key: string) => BADGES.find((b) => b.key === key)?.icon ?? '🏅';

/**
 * A student's XP and badges, for looking into a cheating report: XP history, taking
 * XP away (with a reason students' families never see), and badges staff give by hand.
 */
export function StudentProgressCard({
  userId,
  onDone,
}: {
  userId: string;
  onDone: (message: string) => void;
}) {
  const { state } = useAuth();
  const ability = state.status === 'authenticated' ? state.ability : null;
  const xp = useLoad(
    () => api.GET('/v1/admin/users/{id}/xp', { params: { path: { id: userId } } }),
    userId,
  );
  const [removing, setRemoving] = useState(false);
  const canRemove = ability?.can('create', 'XpAdjustment') ?? false;
  const canGive = ability?.can('create', 'UserBadge') ?? false;
  const canTake = ability?.can('delete', 'UserBadge') ?? false;

  if (xp.error) {
    return (
      <Card title="XP and badges">
        <p className="text-muted">{xp.error}</p>
      </Card>
    );
  }
  if (!xp.data) {
    return (
      <Card title="XP and badges">
        <p className="text-muted">Loading…</p>
      </Card>
    );
  }
  const data = xp.data;
  const done = (message: string) => {
    xp.reload();
    onDone(message);
  };

  return (
    <Card
      title="XP and badges"
      actions={
        canRemove && data.xpTotal > 0 ? (
          <Button size="sm" variant="danger" onClick={() => setRemoving(true)}>
            Remove XP
          </Button>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        <p>
          <strong>{data.xpTotal} XP</strong> in total · {data.weekXp} XP this week (UTC)
        </p>
        <div>
          <h3 className="text-sm font-semibold">Badges</h3>
          {data.badges.length === 0 ? (
            <p className="text-sm text-muted">None yet.</p>
          ) : (
            <ul className="mt-1 flex flex-wrap gap-2">
              {data.badges.map((badge) => (
                <li key={badge.key}>
                  <Badge tone={badge.manual ? 'brand' : 'neutral'}>
                    <span aria-hidden="true">{iconOf(badge.key)}</span> {humanize(badge.key)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
        {canGive || canTake ? (
          <ManualBadges
            userId={userId}
            owned={data.badges}
            canGive={canGive}
            canTake={canTake}
            onDone={done}
          />
        ) : null}
        <XpHistory events={data.events} />
      </div>
      {removing ? (
        <RemoveXpDialog
          userId={userId}
          max={data.xpTotal}
          onClose={() => setRemoving(false)}
          onRemoved={(amount) => {
            setRemoving(false);
            done(`${amount} XP removed. The boards updated straight away.`);
          }}
        />
      ) : null}
    </Card>
  );
}

function XpHistory({ events }: { events: StudentXp['events'] }) {
  if (events.length === 0) return <p className="text-sm text-muted">No XP yet.</p>;
  return (
    <details>
      <summary className="cursor-pointer text-sm font-semibold">
        XP history ({events.length} most recent)
      </summary>
      <ul className="mt-2 flex max-h-72 flex-col gap-1 overflow-auto text-sm">
        {events.map((event) => (
          <li
            key={event.id}
            className="flex flex-wrap justify-between gap-2 border-b border-line py-1"
          >
            <span>
              <span className={event.amount < 0 ? 'font-semibold text-danger' : 'font-semibold'}>
                {event.amount > 0 ? '+' : ''}
                {event.amount}
              </span>{' '}
              {humanize(event.source)}
              {event.reason ? <span className="text-muted"> — {event.reason}</span> : null}
            </span>
            <span className="text-muted">{formatDateTime(event.createdAt)}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function ManualBadges({
  userId,
  owned,
  canGive,
  canTake,
  onDone,
}: {
  userId: string;
  owned: StudentXp['badges'];
  canGive: boolean;
  canTake: boolean;
  onDone: (message: string) => void;
}) {
  const [changing, setChanging] = useState<{ key: string; give: boolean } | null>(null);
  const has = new Set(owned.map((b) => b.key));
  return (
    <div className="flex flex-wrap gap-2">
      {MANUAL_BADGES.map((badge) =>
        has.has(badge.key) ? (
          canTake ? (
            <Button
              key={badge.key}
              size="sm"
              variant="secondary"
              onClick={() => setChanging({ key: badge.key, give: false })}
            >
              Take back “{humanize(badge.key)}”
            </Button>
          ) : null
        ) : canGive ? (
          <Button
            key={badge.key}
            size="sm"
            variant="secondary"
            onClick={() => setChanging({ key: badge.key, give: true })}
          >
            Give “{humanize(badge.key)}” badge
          </Button>
        ) : null,
      )}
      {changing ? (
        <BadgeDialog
          userId={userId}
          badgeKey={changing.key}
          give={changing.give}
          onClose={() => setChanging(null)}
          onChanged={() => {
            setChanging(null);
            onDone(changing.give ? 'Badge given.' : 'Badge taken back.');
          }}
        />
      ) : null}
    </div>
  );
}

function BadgeDialog({
  userId,
  badgeKey,
  give,
  onClose,
  onChanged,
}: {
  userId: string;
  badgeKey: string;
  give: boolean;
  onClose: () => void;
  onChanged: () => void;
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
      give
        ? api.POST('/v1/admin/users/{id}/badges', {
            params: { path: { id: userId } },
            body: { badgeKey, reason: reason.trim() },
          })
        : api.DELETE('/v1/admin/users/{id}/badges/{key}', {
            params: { path: { id: userId, key: badgeKey } },
            body: { reason: reason.trim() },
          }),
    );
    if (ok) onChanged();
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={
        give ? `Give the “${humanize(badgeKey)}” badge?` : `Take back “${humanize(badgeKey)}”?`
      }
    >
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <TextField
          label="Reason"
          hint={
            give
              ? 'Kept in the audit log, e.g. “Helped others in the pilot class”.'
              : 'Kept in the audit log.'
          }
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
          <Button type="submit" variant={give ? 'primary' : 'danger'} loading={action.busy}>
            {give ? 'Give badge' : 'Take back'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function RemoveXpDialog({
  userId,
  max,
  onClose,
  onRemoved,
}: {
  userId: string;
  max: number;
  onClose: () => void;
  onRemoved: (amount: number) => void;
}) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<{ amount?: string; reason?: string }>({});
  const action = useAction();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const value = Number(amount);
    const next: typeof errors = {};
    if (!Number.isInteger(value) || value < 1 || value > max) {
      next.amount = `A whole number from 1 to ${max}.`;
    }
    if (reason.trim().length < 3) next.reason = 'Write a short reason (at least 3 characters).';
    setErrors(next);
    if (next.amount || next.reason) return;
    const ok = await action.run(() =>
      api.POST('/v1/admin/users/{id}/xp-removals', {
        params: { path: { id: userId } },
        body: { amount: value, reason: reason.trim() },
      }),
    );
    if (ok) onRemoved(value);
  }

  return (
    <Dialog open onClose={onClose} title="Remove XP?">
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <p className="text-muted">
          Use this when a student cheated, for example by submitting copied answers in bulk. The XP
          leaves their total and every board straight away.
        </p>
        <TextField
          label="XP to remove"
          type="number"
          inputMode="numeric"
          min={1}
          max={max}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={errors.amount}
        />
        <TextField
          label="Reason"
          hint="Required. Kept in the XP history and the audit log."
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
            Remove XP
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
