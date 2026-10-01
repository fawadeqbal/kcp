'use client';

import type { components } from '@kcp/api-client-ts';
import { Alert, Button, Card, Dialog, TextField } from '@kcp/ui';
import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import { useAction } from '@/lib/action';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { useLoad } from '@/lib/hooks';

type Friend = components['schemas']['StaffFriendDto'];

/**
 * A student's friends (both families approved each one). Moderators and admins end a
 * friendship that was reported, with a reason kept in the audit log.
 */
export function StudentFriendsCard({
  userId,
  onDone,
}: {
  userId: string;
  onDone: (message: string) => void;
}) {
  const { state } = useAuth();
  const canEnd =
    state.status === 'authenticated' ? state.ability.can('delete', 'Friendship') : false;
  const friends = useLoad(
    () => api.GET('/v1/admin/students/{id}/friends', { params: { path: { id: userId } } }),
    userId,
  );
  const [ending, setEnding] = useState<Friend | null>(null);

  return (
    <Card title="Friends">
      {friends.error ? (
        <p className="text-muted">{friends.error}</p>
      ) : !friends.data ? (
        <p className="text-muted">Loading…</p>
      ) : friends.data.length === 0 ? (
        <p className="text-muted">No friends.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {friends.data.map((friend) => (
            <li key={friend.friendshipId} className="flex flex-wrap items-center gap-3">
              <Link href={`/users/${friend.userId}`} className="font-semibold hover:underline">
                <bdi>{friend.nickname}</bdi>
              </Link>
              <span className="text-sm text-muted">since {formatDate(friend.since)}</span>
              {canEnd ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ms-auto"
                  onClick={() => setEnding(friend)}
                >
                  End friendship
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {ending ? (
        <EndFriendshipDialog
          friend={ending}
          onClose={() => setEnding(null)}
          onEnded={() => {
            setEnding(null);
            friends.reload();
            onDone(`The friendship with ${ending.nickname} ended.`);
          }}
        />
      ) : null}
    </Card>
  );
}

function EndFriendshipDialog({
  friend,
  onClose,
  onEnded,
}: {
  friend: Friend;
  onClose: () => void;
  onEnded: () => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | undefined>();
  const action = useAction();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (reason.trim().length < 5) {
      setError('Write a short reason (at least 5 characters).');
      return;
    }
    setError(undefined);
    const ok = await action.run(() =>
      api.POST('/v1/admin/friendships/{id}/end', {
        params: { path: { id: friend.friendshipId } },
        body: { reason: reason.trim() },
      }),
    );
    if (ok) onEnded();
  }

  return (
    <Dialog open onClose={onClose} title={`End the friendship with ${friend.nickname}?`}>
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <p className="text-muted">
          The two students stop seeing each other as friends. Their families can approve a new
          request later.
        </p>
        <TextField
          label="Reason"
          hint="Required. Kept in the audit log."
          value={reason}
          maxLength={500}
          onChange={(e) => setReason(e.target.value)}
          error={error}
        />
        {action.error ? <Alert tone="error">{action.error}</Alert> : null}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" loading={action.busy}>
            End friendship
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
