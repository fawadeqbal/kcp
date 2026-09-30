'use client';

import type { components } from '@kcp/api-client-ts';
import { clsx } from 'clsx';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { isolate } from '@/features/auth/validation';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';

type NotificationList = components['schemas']['NotificationListDto'];
type Item = NotificationList['items'][number];

const POLL_MS = 60_000;
const CHANGED_EVENT = 'kcp:notifications-changed';

/**
 * Tells the bell to check now, after something that makes a notification (a badge,
 * a certificate), instead of waiting for the next check.
 */
export function refreshNotifications() {
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

const str = (value: unknown) => (typeof value === 'string' ? value : '');
const titleIn = (titles: unknown, locale: string) => {
  const map = (titles ?? {}) as Record<string, string>;
  return map[locale] ?? map['en'] ?? '';
};

/** What a notification says and where it leads, in the reader's language. */
function useDescribe() {
  const t = useTranslations('notifications');
  const tb = useTranslations('badges');
  const format = useFormatter();
  const locale = useLocale();
  return (item: Item): { text: string; href: string } => {
    const d = item.data;
    switch (item.type) {
      case 'badge_earned':
        return {
          text: t('badgeEarned', {
            name: tb(`${str(d['badgeKey'])}.name` as 'first-steps.name'),
          }),
          href: '/learn/badges',
        };
      case 'certificate_issued':
        return {
          text: t('certificateIssued', { module: titleIn(d['moduleTitles'], locale) }),
          href: '/learn/portfolio',
        };
      case 'payment_receipt':
        return {
          text: t('paymentReceipt', { number: isolate(str(d['number'])) }),
          href: `/billing/invoices/${str(d['invoiceId'])}`,
        };
      case 'payment_failed':
        return { text: t('paymentFailed'), href: '/billing' };
      case 'plan_ended':
        return { text: t('planEnded'), href: '/billing' };
      case 'trial_ending':
        return {
          text: t('trialEnding', {
            nickname: isolate(str(d['nickname'])),
            date: format.dateTime(new Date(str(d['endsAt'])), { dateStyle: 'medium' }),
          }),
          href: '/billing',
        };
      case 'child_shipped':
        return {
          text: t('childShipped', {
            nickname: isolate(str(d['nickname'])),
            title: titleIn(d['titles'], locale),
          }),
          href: '/dashboard',
        };
      case 'child_certificate':
        return {
          text: t('childCertificate', {
            nickname: isolate(str(d['nickname'])),
            module: titleIn(d['moduleTitles'], locale),
          }),
          href: '/dashboard',
        };
      default:
        return { text: t('other'), href: '/' };
    }
  };
}

/**
 * The bell in the header: new notifications (badges, certificates, payments, a
 * child's shipped project), checked every minute and when the tab comes back.
 */
export function NotificationBell() {
  const t = useTranslations('notifications');
  const format = useFormatter();
  const describe = useDescribe();
  const [list, setList] = useState<NotificationList | null>(null);
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrapper = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.GET('/v1/notifications');
      if (data) setList(data);
    } catch {
      // Offline for a moment: the next check catches up.
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    const onChanged = () => void load();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener(CHANGED_EVENT, onChanged);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(CHANGED_EVENT, onChanged);
    };
  }, [load]);

  // Closes on Escape (focus back on the bell) and on a click outside.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onClick = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  async function markAllRead() {
    await api.POST('/v1/notifications/read', { body: { all: true } }).catch(() => undefined);
    await load();
  }

  const unread = list?.unread ?? 0;
  return (
    <div ref={wrapper} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={unread ? t('bellUnread', { count: String(unread) }) : t('bell')}
        onClick={() => setOpen((o) => !o)}
        className="relative grid size-10 place-items-center rounded-full hover:bg-brand-50"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread ? (
          <span
            aria-hidden="true"
            className="absolute -end-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-danger px-1 text-xs font-bold text-white"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          id={panelId}
          role="region"
          aria-label={t('title')}
          className="absolute end-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-[var(--radius-card)] border border-line bg-surface p-3 shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-bold">{t('title')}</h2>
            {unread ? (
              <button
                type="button"
                className="text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
                onClick={() => void markAllRead()}
              >
                {t('markAllRead')}
              </button>
            ) : null}
          </div>
          {!list || list.items.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">{t('empty')}</p>
          ) : (
            <ul className="flex max-h-96 flex-col gap-1 overflow-auto">
              {list.items.map((item) => {
                const { text, href } = describe(item);
                return (
                  <li key={item.id}>
                    <Link
                      href={href}
                      onClick={() => {
                        setOpen(false);
                        if (!item.read) {
                          void api
                            .POST('/v1/notifications/read', { body: { ids: [item.id] } })
                            .then(load)
                            .catch(() => undefined);
                        }
                      }}
                      className={clsx(
                        'block rounded-lg px-3 py-2 text-sm hover:bg-brand-50',
                        !item.read && 'bg-brand-50/60 font-semibold',
                      )}
                    >
                      <bdi>{text}</bdi>
                      <span className="mt-0.5 block text-xs font-normal text-muted">
                        {format.relativeTime(new Date(item.createdAt))}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
