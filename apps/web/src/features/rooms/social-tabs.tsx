'use client';

import { clsx } from 'clsx';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';

/*
 * Small pieces other pages show (the social tabs, a parent's link to a child's rooms),
 * kept apart from the rooms page so they don't bring its live connection (Socket.IO)
 * into every page that links there.
 */

/** Friends and rooms sit side by side for students. */
export function SocialTabs({ current }: { current: 'friends' | 'rooms' | 'events' | 'classes' }) {
  const t = useTranslations('rooms');
  const tabs = [
    { key: 'friends', href: '/learn/friends', label: t('tabFriends'), icon: 'users' },
    { key: 'rooms', href: '/learn/rooms', label: t('tabRooms'), icon: 'msg' },
    { key: 'events', href: '/learn/events', label: t('tabEvents'), icon: 'trophy' },
    { key: 'classes', href: '/learn/classes', label: t('tabClasses'), icon: 'graduation' },
  ] as const;
  return (
    <nav aria-label={t('tabsLabel')}>
      <ul className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <li key={tab.key}>
            <Link
              href={tab.href}
              aria-current={tab.key === current ? 'page' : undefined}
              className={clsx(
                'flex min-h-11 items-center gap-2 rounded-full px-4 font-bold',
                tab.key === current ? 'bg-ink text-canvas' : 'bg-raised hover:bg-sand-200',
              )}
            >
              <Icon name={tab.icon} />
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** On the child's card: a row that opens their rooms, when they're in any. */
export function ChildRoomsLink({ childId, className }: { childId: string; className: string }) {
  const t = useTranslations('rooms');
  const [count, setCount] = useState(0);
  useEffect(() => {
    void api
      .GET('/v1/children/{childId}/rooms', { params: { path: { childId } } })
      .then(({ data }) => setCount(data?.length ?? 0))
      .catch(() => undefined);
  }, [childId]);
  if (count === 0) return null;
  return (
    <Link href={`/children/${childId}/rooms`} className={className}>
      <Icon name="msg" className="text-base text-muted" />
      <span className="flex-1">{t('childLink', { count })}</span>
      <Icon name="chevR" className="text-sm text-muted" />
    </Link>
  );
}
