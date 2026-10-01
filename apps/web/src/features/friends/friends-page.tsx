'use client';

import type { components } from '@kcp/api-client-ts';
import { useTranslations } from 'next-intl';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Alert, Avatar, Button, Card, Dialog, Icon, PageSpinner, TextField } from '@/components/ui';
import { api, errorCode } from '@/lib/api';
import { errorMessageKey } from '@/lib/errors';
import { useAccount } from '@/lib/use-account';
import { isolate } from '../auth/validation';
import { SocialTabs } from '../rooms/social-tabs';

type Friends = components['schemas']['FriendsDto'];
type Board = components['schemas']['FriendBoardDto'];
type Friend = components['schemas']['FriendDto'];

/** "K7MQ4X" → "K7M Q4X": easier to read out. */
const spaced = (code: string) => `${code.slice(0, 3)} ${code.slice(3)}`;

/**
 * A student's friends: their friend code to give out, adding a friend by code (a
 * parent of each child approves), requests still waiting, and this week's XP together.
 */
export function FriendsPage() {
  const t = useTranslations();
  const user = useAccount('STUDENT');
  const [friends, setFriends] = useState<Friends | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [failed, setFailed] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [removing, setRemoving] = useState<Friend | null>(null);

  const load = useCallback(async () => {
    try {
      const [list, week] = await Promise.all([
        api.GET('/v1/friends'),
        api.GET('/v1/friends/board'),
      ]);
      if (list.data) setFriends(list.data);
      else setFailed(true);
      if (week.data) setBoard(week.data);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (busy || !code.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const { data, error } = await api.POST('/v1/friends/requests', { body: { code } });
      if (data) {
        setCode('');
        setMessage({
          tone: 'success',
          text: t('friends.sent', { nickname: isolate(data.nickname) }),
        });
        await load();
      } else {
        setMessage({ tone: 'error', text: t(`errors.${errorMessageKey(errorCode(error))}`) });
      }
    } catch {
      setMessage({ tone: 'error', text: t('errors.network') });
    } finally {
      setBusy(false);
    }
  }

  if (!user || (!friends && !failed)) return <PageSpinner />;
  if (!friends) return <Alert tone="error">{t('friends.loadFailed')}</Alert>;

  const status = (value: string) =>
    value === 'DECLINED'
      ? t('friends.statusDeclined')
      : value === 'EXPIRED'
        ? t('friends.statusExpired')
        : t('friends.statusPending');
  const waiting = [
    ...friends.received.map((r) => ({ ...r, mine: false })),
    ...friends.sent.map((r) => ({ ...r, mine: true })),
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-4">
        <SocialTabs current="friends" />
        <div>
          <h1 className="text-4xl">{t('friends.title')}</h1>
          <p className="mt-1.5 text-lg text-muted">{t('friends.subtitle')}</p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-xl">{t('friends.yourCode')}</h2>
          <p
            dir="ltr"
            className="mt-3 font-latin text-4xl font-extrabold tracking-[0.15em] text-brand-text"
          >
            {spaced(friends.code)}
          </p>
          <p className="mt-2 text-sm text-muted">{t('friends.codeHelp')}</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => {
              void navigator.clipboard
                ?.writeText(friends.code)
                .then(() => setCopied(true))
                .catch(() => undefined);
            }}
          >
            <Icon name={copied ? 'check' : 'copy'} />
            {copied ? t('friends.copied') : t('friends.copy')}
          </Button>
        </Card>
        <Card>
          <h2 className="text-xl">{t('friends.addTitle')}</h2>
          <form className="mt-3 flex flex-col gap-3" onSubmit={send} noValidate>
            <TextField
              label={t('friends.codeLabel')}
              name="friend-code"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              dir="ltr"
              className="font-latin text-xl tracking-widest"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
            <Button type="submit" loading={busy} className="self-start">
              <Icon name="userPlus" />
              {t('friends.send')}
            </Button>
          </form>
        </Card>
      </div>
      <div aria-live="polite">
        {message ? (
          <Alert tone={message.tone} live={false}>
            {message.text}
          </Alert>
        ) : null}
      </div>

      {waiting.length ? (
        <section aria-labelledby="waiting-heading" className="flex flex-col gap-3">
          <h2 id="waiting-heading" className="text-2xl">
            {t('friends.requestsTitle')}
          </h2>
          <ul className="flex flex-col gap-2">
            {waiting.map((request) => (
              <li
                key={request.id}
                className="flex flex-wrap items-center gap-3 rounded-row bg-surface px-4 py-3"
              >
                <Avatar avatarKey={request.avatarKey} size="sm" />
                <span className="flex-1 font-semibold">
                  {request.mine
                    ? t('friends.youAsked', { nickname: isolate(request.nickname) })
                    : t('friends.theyAsked', { nickname: isolate(request.nickname) })}
                </span>
                <span className="text-sm text-muted">{status(request.status)}</span>
                {request.mine && request.status === 'PENDING' ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      await api
                        .DELETE('/v1/friends/requests/{id}', {
                          params: { path: { id: request.id } },
                        })
                        .catch(() => undefined);
                      await load();
                    }}
                  >
                    {t('friends.cancel')}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="board-heading" className="flex flex-col gap-3">
        <h2 id="board-heading" className="text-2xl">
          {t('friends.boardTitle')}
        </h2>
        {friends.friends.length === 0 ? (
          <p className="rounded-card border-2 border-dashed border-line px-6 py-8 text-center text-muted">
            {t('friends.none')}
          </p>
        ) : (
          <ol className="flex flex-col gap-1.5">
            {(board?.entries ?? []).map((entry) => (
              <li
                key={entry.userId}
                aria-current={entry.isMe ? 'true' : undefined}
                className={`flex items-center gap-3 rounded-full px-4 py-2 ${
                  entry.isMe ? 'bg-brand-100' : 'bg-surface'
                }`}
              >
                <span className="w-8 font-display text-lg">{entry.rank}</span>
                <Avatar avatarKey={entry.avatarKey} size="sm" />
                <span className="flex-1 font-semibold">
                  <bdi>{entry.nickname}</bdi>
                  {entry.isMe ? (
                    <span className="ms-2 rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-on-primary">
                      {t('league.you')}
                    </span>
                  ) : null}
                </span>
                <span className="font-bold">
                  {entry.xp} {t('league.xp')}
                </span>
                {entry.isMe ? null : (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`${t('friends.remove')}: ${entry.nickname}`}
                    onClick={() =>
                      setRemoving(friends.friends.find((f) => f.userId === entry.userId) ?? null)
                    }
                  >
                    <Icon name="x" />
                  </Button>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      <Dialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={t('friends.removeTitle', { nickname: isolate(removing?.nickname ?? '') })}
      >
        <p className="text-muted">{t('friends.removeBody')}</p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setRemoving(null)}>
            {t('friends.cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (!removing) return;
              await api
                .DELETE('/v1/friends/{userId}', { params: { path: { userId: removing.userId } } })
                .catch(() => undefined);
              setRemoving(null);
              await load();
            }}
          >
            {t('friends.remove')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
