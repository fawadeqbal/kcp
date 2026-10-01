'use client';

import type { components } from '@kcp/api-client-ts';
import { clsx } from 'clsx';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BackLink } from '@/components/back-link';
import { Alert, Badge, Icon, PageSpinner } from '@/components/ui';
import { usePathname, useRouter } from '@/i18n/navigation';
import { api } from '@/lib/api';
import type { Area } from '@/lib/auth-provider';
import { useAccountIn } from '@/lib/use-account';
import { isolate } from '../auth/validation';
import { RoomView } from './room-view';
import { SocialTabs } from './social-tabs';
import { useRoomEvents } from './use-room-events';

type Room = components['schemas']['ChatRoomDto'];
type Message = components['schemas']['ChatMessageDto'];

/** A list of rooms to pick from. */
function RoomList({
  rooms,
  selected,
  onSelect,
}: {
  rooms: Room[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const t = useTranslations('rooms');
  return (
    <ul className="flex flex-col gap-2">
      {rooms.map((room) => (
        <li key={room.id}>
          <button
            type="button"
            aria-current={room.id === selected ? 'true' : undefined}
            onClick={() => onSelect(room.id)}
            className={clsx(
              'flex w-full items-center gap-3 rounded-row border-2 px-3.5 py-3 text-start',
              room.id === selected
                ? 'border-brand bg-brand-100'
                : 'border-transparent bg-raised hover:border-line',
            )}
          >
            <Icon
              name={
                room.kind === 'CLASS'
                  ? 'graduation'
                  : room.kind === 'EVENT'
                    ? 'trophy'
                    : room.kind === 'HUB'
                      ? 'rocket'
                      : 'users'
              }
            />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-bold">{isolate(room.name)}</span>
              <span className="text-sm text-muted">
                {room.archived ? t('archivedBadge') : t(`kinds.${room.kind}`)}
              </span>
            </span>
            {room.unread > 0 ? (
              <Badge tone="brand">
                <span className="sr-only">{t('unread', { count: room.unread })}</span>
                <span aria-hidden="true">{room.unread}</span>
              </Badge>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * The rooms of the signed-in member's teams, classes and events: pick one on the side,
 * read and write in it. Messages arrive live.
 */
export function RoomsPage({ areas = ['STUDENT'] }: { areas?: readonly Area[] }) {
  const t = useTranslations('rooms');
  const user = useAccountIn(areas);
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [failed, setFailed] = useState(false);
  const bus = useMemo(() => new EventTarget(), []);
  const selected = params.get('room') ?? rooms?.[0]?.id ?? null;

  const load = useCallback(async () => {
    try {
      const { data } = await api.GET('/v1/rooms');
      if (data) setRooms(data);
      else setFailed(true);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  useRoomEvents(Boolean(user), {
    onMessage: (message: Message) => {
      bus.dispatchEvent(new CustomEvent('message', { detail: message }));
      if (message.roomId !== selected && message.author.id !== user?.id) {
        setRooms(
          (current) =>
            current?.map((room) =>
              room.id === message.roomId ? { ...room, unread: room.unread + 1 } : room,
            ) ?? null,
        );
      }
    },
    onHidden: (event) => bus.dispatchEvent(new CustomEvent('hidden', { detail: event })),
    onReconnect: () => {
      bus.dispatchEvent(new Event('reconnect'));
      void load();
    },
  });

  const onRoom = useCallback((room: Room) => {
    setRooms((current) => current?.map((r) => (r.id === room.id ? room : r)) ?? null);
  }, []);

  if (!user || (!rooms && !failed)) return <PageSpinner />;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-4">
        {user.kind === 'STUDENT' ? <SocialTabs current="rooms" /> : null}
        <div>
          <h1 className="text-4xl">{t('title')}</h1>
          <p className="mt-1.5 text-lg text-muted">{t('subtitle')}</p>
        </div>
      </header>
      {!rooms ? (
        <Alert tone="error">{t('loadFailed')}</Alert>
      ) : rooms.length === 0 ? (
        <p className="rounded-card border-2 border-dashed border-line px-6 py-10 text-center text-muted">
          {t('none')}
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-[16rem_minmax(0,1fr)]">
          <nav aria-label={t('listLabel')}>
            <RoomList
              rooms={rooms}
              selected={selected}
              onSelect={(id) => router.replace(`${pathname}?room=${id}`, { scroll: false })}
            />
          </nav>
          {selected && rooms.some((r) => r.id === selected) ? (
            <RoomView
              key={selected}
              roomId={selected}
              viewerId={user.id}
              source={{ kind: 'member' }}
              bus={bus}
              onRoom={onRoom}
            />
          ) : (
            <Alert tone="error">{t('loadFailed')}</Alert>
          )}
        </div>
      )}
    </div>
  );
}

/** A parent reads one of their child's rooms (read only). */
export function ChildRoomsPage({ childId }: { childId: string }) {
  const t = useTranslations('rooms');
  const user = useAccountIn(['PARENT']);
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [nickname, setNickname] = useState('');
  const [failed, setFailed] = useState(false);
  const selected = params.get('room') ?? rooms?.[0]?.id ?? null;

  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const [list, child] = await Promise.all([
          api.GET('/v1/children/{childId}/rooms', { params: { path: { childId } } }),
          api.GET('/v1/children/{id}', { params: { path: { id: childId } } }),
        ]);
        if (list.data) setRooms(list.data);
        else setFailed(true);
        if (child.data) setNickname(child.data.nickname);
      } catch {
        setFailed(true);
      }
    })();
  }, [user, childId]);

  if (!user || (!rooms && !failed)) return <PageSpinner />;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header>
        <BackLink href="/dashboard">{t('back')}</BackLink>
        <h1 className="mt-3 text-4xl">{t('childTitle', { nickname: isolate(nickname) })}</h1>
        <p className="mt-1.5 text-lg text-muted">{t('childSubtitle')}</p>
      </header>
      {!rooms ? (
        <Alert tone="error">{t('loadFailed')}</Alert>
      ) : rooms.length === 0 ? (
        <p className="rounded-card border-2 border-dashed border-line px-6 py-10 text-center text-muted">
          {t('childNone', { nickname: isolate(nickname) })}
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-[16rem_minmax(0,1fr)]">
          <nav aria-label={t('listLabel')}>
            <RoomList
              rooms={rooms}
              selected={selected}
              onSelect={(id) => router.replace(`${pathname}?room=${id}`, { scroll: false })}
            />
          </nav>
          {selected ? (
            <RoomView
              key={selected}
              roomId={selected}
              viewerId={childId}
              source={{ kind: 'parent', childId }}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
