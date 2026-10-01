'use client';

import type { components } from '@kcp/api-client-ts';
import {
  CHAT_MESSAGE_MAX_LENGTH,
  CHAT_PHRASES,
  CHAT_REPORT_REASONS,
  type ChatPhrase,
} from '@kcp/shared';
import { clsx } from 'clsx';
import { useFormatter, useTranslations } from 'next-intl';
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Avatar, Badge, Button, Dialog, Icon, inputClass, Spinner } from '@/components/ui';
import { api, errorCode } from '@/lib/api';
import { errorMessageKey } from '@/lib/errors';
import { isolate } from '../auth/validation';

type Room = components['schemas']['ChatRoomDto'];
type Message = components['schemas']['ChatMessageDto'];
type Page = components['schemas']['ChatMessagesDto'];
type Reason = (typeof CHAT_REPORT_REASONS)[number];

/** Where a room's messages come from: the member's own, or (read only) a child's. */
export type RoomSource = { kind: 'member' } | { kind: 'parent'; childId: string };

/** How often a room is reloaded when live updates can't reach it. */
const POLL_MS = 30_000;

function blockedDetail(error: unknown): string | undefined {
  const details = (error as { details?: { reason?: unknown } } | undefined)?.details;
  return typeof details?.reason === 'string' ? details.reason : undefined;
}

/**
 * One room: its messages (oldest first, older ones on request) and, for members, the
 * phrases to send, a text box (13 and older, and adults), and a report button on
 * other people's messages. Live messages arrive through `bus` (see useRoomEvents).
 */
export function RoomView({
  roomId,
  viewerId,
  source,
  bus,
  onRoom,
}: {
  roomId: string;
  viewerId: string;
  source: RoomSource;
  bus?: EventTarget;
  /** The room as the server sees it now (unread, muted, archived). */
  onRoom?: (room: Room) => void;
}) {
  const t = useTranslations('rooms');
  const te = useTranslations('errors');
  const format = useFormatter();
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [reporting, setReporting] = useState<Message | null>(null);
  const [reason, setReason] = useState<Reason>('UNKIND');
  const listRef = useRef<HTMLDivElement>(null);
  const stickToEnd = useRef(true);
  const member = source.kind === 'member';
  const onRoomRef = useRef(onRoom);
  onRoomRef.current = onRoom;

  const fetchPage = useCallback(
    async (before?: string): Promise<Page | undefined> => {
      const query = before ? { before } : {};
      const result =
        source.kind === 'member'
          ? await api.GET('/v1/rooms/{id}/messages', {
              params: { path: { id: roomId }, query },
            })
          : await api.GET('/v1/children/{childId}/rooms/{roomId}/messages', {
              params: { path: { childId: source.childId, roomId }, query },
            });
      return result.data;
    },
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- childId is what matters
    [roomId, source.kind, source.kind === 'parent' ? source.childId : null],
  );

  const markRead = useCallback(async () => {
    if (member) {
      await api
        .POST('/v1/rooms/{id}/read', { params: { path: { id: roomId } } })
        .catch(() => undefined);
    }
  }, [member, roomId]);

  const load = useCallback(async () => {
    try {
      const page = await fetchPage();
      if (!page) {
        setFailed(true);
        return;
      }
      setFailed(false);
      setRoom(page.room);
      setMessages(page.messages);
      setHasMore(page.hasMore);
      onRoomRef.current?.({ ...page.room, unread: 0 });
      await markRead();
    } catch {
      setFailed(true);
    }
  }, [fetchPage, markRead]);

  useEffect(() => {
    setRoom(null);
    setMessages([]);
    setNotice(null);
    stickToEnd.current = true;
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  // Live messages and removals for this room.
  useEffect(() => {
    if (!bus) return;
    const onMessage = (event: Event) => {
      const message = (event as CustomEvent<Message>).detail;
      if (message.roomId !== roomId) return;
      setMessages((current) =>
        current.some((m) => m.id === message.id) ? current : [...current, message],
      );
      void markRead();
    };
    const onHidden = (event: Event) => {
      const { roomId: where, messageId } = (
        event as CustomEvent<{ roomId: string; messageId: string }>
      ).detail;
      if (where !== roomId) return;
      setMessages((current) =>
        current.map((m) =>
          m.id === messageId ? { ...m, hidden: true, text: null, phraseKey: null } : m,
        ),
      );
    };
    const onReconnect = () => void load();
    bus.addEventListener('message', onMessage);
    bus.addEventListener('hidden', onHidden);
    bus.addEventListener('reconnect', onReconnect);
    return () => {
      bus.removeEventListener('message', onMessage);
      bus.removeEventListener('hidden', onHidden);
      bus.removeEventListener('reconnect', onReconnect);
    };
  }, [bus, roomId, markRead, load]);

  // New messages keep the view at the end, unless the reader scrolled up.
  useEffect(() => {
    const list = listRef.current;
    if (list && stickToEnd.current) list.scrollTop = list.scrollHeight;
  }, [messages]);

  async function older() {
    const first = messages[0];
    if (!first) return;
    stickToEnd.current = false;
    const page = await fetchPage(first.createdAt).catch(() => undefined);
    if (page) {
      setMessages((current) => [...page.messages, ...current]);
      setHasMore(page.hasMore);
    }
  }

  async function send(body: { phrase: ChatPhrase } | { text: string }) {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    stickToEnd.current = true;
    try {
      const { data, error } = await api.POST('/v1/rooms/{id}/messages', {
        params: { path: { id: roomId } },
        body,
      });
      if (data) {
        setMessages((current) =>
          current.some((m) => m.id === data.id) ? current : [...current, data],
        );
        if ('text' in body) setText('');
      } else {
        const code = errorCode(error);
        if (code === 'MESSAGE_BLOCKED') {
          const why = blockedDetail(error);
          setNotice({
            tone: 'error',
            text:
              why === 'LINK' || why === 'EMAIL' || why === 'PHONE' || why === 'CONTACT'
                ? t(`blocked.${why}`)
                : t('blocked.WORDS'),
          });
        } else {
          setNotice({ tone: 'error', text: te(errorMessageKey(code)) });
          if (code === 'CHAT_MUTED' || code === 'ROOM_ARCHIVED') void load();
        }
      }
    } catch {
      setNotice({ tone: 'error', text: te('network') });
    } finally {
      setBusy(false);
    }
  }

  async function report() {
    if (!reporting) return;
    const target = reporting;
    setReporting(null);
    const { error } = await api
      .POST('/v1/rooms/{id}/reports', {
        params: { path: { id: roomId } },
        body: { messageId: target.id, reason },
      })
      .catch(() => ({ error: { error: 'NETWORK' } }));
    setNotice(
      error
        ? { tone: 'error', text: te(errorMessageKey(errorCode(error))) }
        : { tone: 'success', text: t('reported') },
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = text.trim();
    if (value) void send({ text: value });
  }

  if (failed && !room) return <Alert tone="error">{t('loadFailed')}</Alert>;
  if (!room) {
    return (
      <div className="grid min-h-60 place-items-center">
        <Spinner />
      </div>
    );
  }

  const time = (iso: string) => {
    const date = new Date(iso);
    const today = new Date().toDateString() === date.toDateString();
    return format.dateTime(
      date,
      today
        ? { hour: 'numeric', minute: '2-digit' }
        : { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' },
    );
  };
  const canSend = member && !room.archived && !room.mutedUntil;

  return (
    <section aria-labelledby="room-heading" className="flex min-w-0 flex-col gap-3">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 id="room-heading" className="text-2xl">
          {room.name}
        </h2>
        <Badge tone="neutral">{t(`kinds.${room.kind}`)}</Badge>
        {room.archived ? <Badge tone="warning">{t('archivedBadge')}</Badge> : null}
      </header>
      <p className="flex items-start gap-2 rounded-row bg-canvas px-3.5 py-2.5 text-sm">
        <Icon name="shield" className="mt-0.5 text-brand" />
        <span>{member ? t('safety') : t('parentSafety')}</span>
      </p>

      <div className="rounded-card border-2 border-line bg-surface">
        {hasMore ? (
          <div className="border-b border-line p-2 text-center">
            <Button variant="ghost" size="sm" onClick={() => void older()}>
              {t('older')}
            </Button>
          </div>
        ) : null}
        <div
          ref={listRef}
          role="log"
          aria-label={t('messagesLabel', { room: isolate(room.name) })}
          onScroll={(event) => {
            const list = event.currentTarget;
            stickToEnd.current = list.scrollHeight - list.scrollTop - list.clientHeight < 40;
          }}
          className="flex max-h-[28rem] min-h-48 flex-col overflow-y-auto p-4"
        >
          {messages.length === 0 ? (
            <p className="m-auto text-center text-muted">{t('empty')}</p>
          ) : null}
          <ol className="flex flex-col gap-3">
            {messages.map((message) => {
              const mine = message.author.id === viewerId;
              return (
                <li
                  key={message.id}
                  className={clsx(
                    'flex max-w-[85%] items-end gap-2',
                    mine && 'ms-auto flex-row-reverse',
                  )}
                >
                  {message.author.avatarKey ? (
                    <Avatar avatarKey={message.author.avatarKey} size="sm" />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="grid size-9 shrink-0 place-items-center rounded-full bg-sage-200 text-sage-text"
                    >
                      <Icon name="graduation" />
                    </span>
                  )}
                  <div className={clsx('flex min-w-0 flex-col gap-1', mine && 'items-end')}>
                    <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                      <span className="font-bold text-ink">
                        {mine ? t('you') : isolate(message.author.name)}
                      </span>
                      {message.author.isAdult ? <Badge tone="brand">{t('adult')}</Badge> : null}
                      <time dateTime={message.createdAt}>{time(message.createdAt)}</time>
                    </p>
                    <div className="flex items-center gap-1">
                      <p
                        className={clsx(
                          'rounded-row px-3.5 py-2 break-words',
                          message.hidden
                            ? 'border border-dashed border-line text-sm text-muted italic'
                            : mine
                              ? 'bg-brand text-on-primary'
                              : 'bg-sage-100',
                        )}
                      >
                        {message.hidden
                          ? t('removed')
                          : message.kind === 'PHRASE'
                            ? t(`phrases.${message.phraseKey ?? 'hello'}` as 'phrases.hello')
                            : message.text}
                      </p>
                      {member && !mine && !message.hidden ? (
                        <button
                          type="button"
                          onClick={() => {
                            setReason('UNKIND');
                            setReporting(message);
                          }}
                          className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                          aria-label={t('reportMessage', { name: isolate(message.author.name) })}
                        >
                          <Icon name="flag" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <div aria-live="polite">
        {notice ? (
          <Alert tone={notice.tone} live={false}>
            {notice.text}
          </Alert>
        ) : null}
      </div>

      {member && room.archived ? <p className="text-muted">{t('archived')}</p> : null}
      {member && !room.archived && room.mutedUntil ? (
        <Alert tone="warning">
          {t('muted', {
            until: format.dateTime(new Date(room.mutedUntil), {
              day: 'numeric',
              month: 'long',
              hour: 'numeric',
              minute: '2-digit',
            }),
          })}
        </Alert>
      ) : null}
      {canSend ? (
        <div className="flex flex-col gap-3">
          <fieldset>
            <legend className="mb-2 text-sm font-bold">{t('phrasesLabel')}</legend>
            <div className="flex flex-wrap gap-2">
              {CHAT_PHRASES.map((phrase) => (
                <Button
                  key={phrase}
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={() => void send({ phrase })}
                >
                  {t(`phrases.${phrase}`)}
                </Button>
              ))}
            </div>
          </fieldset>
          {room.canType ? (
            <form onSubmit={submit} className="flex items-end gap-2">
              <label className="flex flex-1 flex-col gap-1.5">
                <span className="text-sm font-bold">{t('typeLabel')}</span>
                <input
                  value={text}
                  maxLength={CHAT_MESSAGE_MAX_LENGTH}
                  onChange={(event) => setText(event.target.value)}
                  dir="auto"
                  autoComplete="off"
                  className={inputClass()}
                />
              </label>
              <Button type="submit" loading={busy} disabled={!text.trim()}>
                <Icon name="send" />
                {t('send')}
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted">{t('phrasesOnly')}</p>
          )}
        </div>
      ) : null}

      <Dialog open={reporting !== null} onClose={() => setReporting(null)} title={t('reportTitle')}>
        <p className="text-muted">{t('reportIntro')}</p>
        {reporting ? (
          <blockquote className="mt-3 rounded-row bg-canvas px-3.5 py-2 break-words">
            {reporting.kind === 'PHRASE'
              ? t(`phrases.${reporting.phraseKey ?? 'hello'}` as 'phrases.hello')
              : reporting.text}
          </blockquote>
        ) : null}
        <fieldset className="mt-4 flex flex-col gap-2">
          <legend className="mb-1 font-bold">{t('reasonLabel')}</legend>
          {CHAT_REPORT_REASONS.map((value) => (
            <label key={value} className="flex items-center gap-2.5">
              <input
                type="radio"
                name="report-reason"
                value={value}
                checked={reason === value}
                onChange={() => setReason(value)}
                className="size-5 accent-brand"
              />
              {t(`reasons.${value}`)}
            </label>
          ))}
        </fieldset>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => setReporting(null)}>
            {t('cancel')}
          </Button>
          <Button onClick={() => void report()}>
            <Icon name="flag" />
            {t('reportSend')}
          </Button>
        </div>
      </Dialog>
    </section>
  );
}
