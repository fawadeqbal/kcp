'use client';

import type { components } from '@kcp/api-client-ts';
import { useFormatter, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Avatar, Button, SectionHeading } from '@/components/ui';
import { api, errorCode } from '@/lib/api';
import { errorMessageKey } from '@/lib/errors';
import { isolate } from '../auth/validation';

type Request = components['schemas']['ParentFriendRequestDto'];
type Friend = components['schemas']['FriendDto'];

/**
 * Friend requests of the parent's children, on the dashboard (only when there are
 * some): approve or decline each. Both families must approve.
 */
export function FriendRequestsCard() {
  const t = useTranslations();
  const [requests, setRequests] = useState<Request[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    const { data } = await api.GET('/v1/friend-requests').catch(() => ({ data: undefined }));
    setRequests(data ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(request: Request, approve: boolean) {
    setBusy(request.id);
    setMessage(null);
    const names = {
      child: isolate(request.child.nickname),
      other: isolate(request.other.nickname),
    };
    try {
      const { data, error } = await api.POST('/v1/friend-requests/{id}/decision', {
        params: { path: { id: request.id } },
        body: { approve },
      });
      if (data) {
        setMessage({
          tone: 'success',
          text:
            data.status === 'APPROVED'
              ? t('parentFriends.done', names)
              : data.status === 'DECLINED'
                ? t('parentFriends.declined', names)
                : t('parentFriends.approved'),
        });
        await load();
      } else {
        setMessage({ tone: 'error', text: t(`errors.${errorMessageKey(errorCode(error))}`) });
      }
    } catch {
      setMessage({ tone: 'error', text: t('errors.network') });
    } finally {
      setBusy(null);
    }
  }

  if (!requests || (requests.length === 0 && !message)) return null;
  return (
    <section aria-labelledby="friend-requests-heading" className="flex flex-col gap-3">
      <SectionHeading id="friend-requests-heading">{t('parentFriends.title')}</SectionHeading>
      <p className="text-muted">{t('parentFriends.intro')}</p>
      <div aria-live="polite">
        {message ? (
          <Alert tone={message.tone} live={false}>
            {message.text}
          </Alert>
        ) : null}
      </div>
      <ul className="flex flex-col gap-2.5">
        {requests.map((request) => {
          const names = {
            child: isolate(request.child.nickname),
            other: isolate(request.other.nickname),
          };
          return (
            <li
              key={request.id}
              className="flex flex-wrap items-center gap-3 rounded-card bg-surface p-4"
            >
              <span className="flex -space-x-3 rtl:space-x-reverse">
                <Avatar avatarKey={request.child.avatarKey} size="sm" />
                <Avatar avatarKey={request.other.avatarKey} size="sm" />
              </span>
              <span className="min-w-48 flex-1 font-semibold">
                {request.direction === 'sent'
                  ? t('parentFriends.sent', names)
                  : t('parentFriends.received', names)}
              </span>
              {request.waitingForYou ? (
                <span className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy !== null}
                    onClick={() => void decide(request, false)}
                  >
                    {t('parentFriends.decline')}
                  </Button>
                  <Button
                    size="sm"
                    loading={busy === request.id}
                    disabled={busy !== null}
                    onClick={() => void decide(request, true)}
                  >
                    {t('parentFriends.approve')}
                  </Button>
                </span>
              ) : (
                <span className="text-sm text-muted">{t('parentFriends.waitingOther')}</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** A child's friends, for their parent (in the child's settings): end a friendship. */
export function ChildFriendsSection({ childId, nickname }: { childId: string; nickname: string }) {
  const t = useTranslations();
  const format = useFormatter();
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [ended, setEnded] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api
      .GET('/v1/children/{id}/friends', { params: { path: { id: childId } } })
      .catch(() => ({ data: undefined }));
    setFriends(data ?? []);
  }, [childId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!friends) return null;
  return (
    <div className="flex flex-col gap-3">
      <div aria-live="polite">
        {ended ? (
          <Alert tone="success" live={false}>
            {t('childFriends.ended')}
          </Alert>
        ) : null}
      </div>
      {friends.length === 0 ? (
        <p className="text-muted">{t('childFriends.none', { nickname: isolate(nickname) })}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {friends.map((friend) => (
            <li
              key={friend.userId}
              className="flex flex-wrap items-center gap-3 rounded-row bg-raised px-3 py-2"
            >
              <Avatar avatarKey={friend.avatarKey} size="sm" />
              <span className="flex-1">
                <span className="block font-semibold">
                  <bdi>{friend.nickname}</bdi>
                </span>
                <span className="text-sm text-muted">
                  {t('childFriends.since', {
                    date: format.dateTime(new Date(friend.since), { dateStyle: 'medium' }),
                  })}
                </span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await api
                    .DELETE('/v1/children/{id}/friends/{friendId}', {
                      params: { path: { id: childId, friendId: friend.userId } },
                    })
                    .catch(() => undefined);
                  setEnded(true);
                  await load();
                }}
              >
                {t('childFriends.end')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
