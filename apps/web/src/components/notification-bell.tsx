'use client';

import type { components } from '@kcp/api-client-ts';
import { clsx } from 'clsx';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { isolate } from '@/features/auth/validation';
import { Icon, Popover } from '@kcp/ui';
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
  const tl = useTranslations('league');
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
      case 'review_done':
        return {
          text: t(d['decision'] === 'APPROVED' ? 'reviewApproved' : 'reviewChanges'),
          href: `/reviews/${str(d['reviewId'])}`,
        };
      case 'child_reviewed':
        return {
          text: t('childReviewed', { nickname: isolate(str(d['nickname'])) }),
          href: `/reviews/${str(d['reviewId'])}`,
        };
      case 'league_result': {
        const tier = tl(`tiers.${str(d['tier'])}` as 'tiers.bronze');
        return {
          text: t(d['outcome'] === 'PROMOTED' ? 'leagueUp' : 'leagueDown', { tier }),
          href: '/learn/league',
        };
      }
      case 'friend_request':
        return {
          text: t('friendRequest', {
            nickname: isolate(str(d['nickname'])),
            friend: isolate(str(d['friendNickname'])),
          }),
          href: '/dashboard',
        };
      case 'friend_added':
        return {
          text: t('friendAdded', { nickname: isolate(str(d['nickname'])) }),
          href: '/learn/friends',
        };
      case 'referral_rewarded':
        return {
          text: t('referralRewarded', { days: String(d['days'] ?? '') }),
          href: '/dashboard',
        };
      case 'weekly_report':
        return { text: t('weeklyReport'), href: '/reports' };
      case 'chat_warning':
        return { text: t('chatWarning'), href: '/learn/rooms' };
      case 'chat_muted':
        return {
          text: t('chatMuted', {
            until: format.dateTime(new Date(str(d['until'])), {
              dateStyle: 'medium',
              timeStyle: 'short',
            }),
          }),
          href: '/learn/rooms',
        };
      case 'child_chat_action': {
        const nickname = isolate(str(d['nickname']));
        const text =
          d['action'] === 'MUTE'
            ? t('childChatMuted', {
                nickname,
                until: format.dateTime(new Date(str(d['until'])), {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }),
              })
            : d['action'] === 'SUSPEND'
              ? t('childChatSuspended', { nickname })
              : t('childChatWarned', { nickname });
        return { text, href: `/children/${str(d['childId'])}/rooms` };
      }
      case 'chat_report_done':
        return { text: t('chatReportDone'), href: '/learn/rooms' };
      case 'event_join_request':
        return {
          text: t('eventJoinRequest', {
            nickname: isolate(str(d['nickname'])),
            team: isolate(str(d['team'])),
            event: isolate(str(d['event'])),
          }),
          href: '/dashboard',
        };
      case 'event_joined':
        return {
          text: t('eventJoined', {
            team: isolate(str(d['team'])),
            event: isolate(str(d['event'])),
          }),
          href: `/learn/events/${str(d['slug'])}`,
        };
      case 'event_results':
        return {
          text: t('eventResults', { event: isolate(str(d['event'])) }),
          href: `/learn/events/${str(d['slug'])}`,
        };
      case 'class_join_request':
        return {
          text: t('classJoinRequest', {
            nickname: isolate(str(d['nickname'])),
            className: isolate(str(d['className'])),
            school: isolate(str(d['school'])),
          }),
          href: '/dashboard',
        };
      case 'class_joined':
        return {
          text: t('classJoined', { className: isolate(str(d['className'])) }),
          href: '/learn/classes',
        };
      case 'assignment_new':
        return {
          text: t('assignmentNew', { className: isolate(str(d['className'])) }),
          href: '/learn/classes',
        };
      case 'readiness_result':
        return {
          text: t(d['passed'] === true ? 'readinessPassed' : 'readinessNotYet'),
          href: `/reviews/${str(d['reviewId'])}`,
        };
      case 'child_readiness':
        return {
          text: t(d['passed'] === true ? 'childReadinessPassed' : 'childReadinessNotYet', {
            nickname: isolate(str(d['nickname'])),
          }),
          href: `/reviews/${str(d['reviewId'])}`,
        };
      case 'hub_eligible':
        return { text: t('hubEligible'), href: '/learn/hub' };
      case 'hub_signed_off':
        return { text: t('hubSignedOff'), href: '/learn/hub' };
      case 'hub_paused':
        return { text: t('hubPaused'), href: '/learn/hub' };
      case 'hub_invite':
        return {
          text: t('hubInvite', { title: isolate(str(d['title'])) }),
          href: '/learn/hub',
        };
      case 'hub_joined':
        return {
          text: t('hubJoined', { title: isolate(str(d['title'])) }),
          href: `/learn/hub/projects/${str(d['projectId'])}`,
        };
      case 'child_hub_signed_off':
        return {
          text: t('childHubSignedOff', { nickname: isolate(str(d['nickname'])) }),
          href: `/children/${str(d['childId'])}/hub`,
        };
      case 'child_hub_paused':
        return {
          text: t('childHubPaused', { nickname: isolate(str(d['nickname'])) }),
          href: `/children/${str(d['childId'])}/hub`,
        };
      case 'child_hub_consent':
        return {
          text: t('childHubConsent', {
            by: isolate(str(d['by'])),
            nickname: isolate(str(d['nickname'])),
          }),
          href: `/children/${str(d['childId'])}/hub`,
        };
      case 'child_hub_invite':
        return {
          text: t('childHubInvite', {
            nickname: isolate(str(d['nickname'])),
            title: isolate(str(d['title'])),
          }),
          href: '/hub',
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

  async function markAllRead() {
    await api.POST('/v1/notifications/read', { body: { all: true } }).catch(() => undefined);
    await load();
  }

  const unread = list?.unread ?? 0;
  return (
    <Popover
      label={unread ? t('bellUnread', { count: String(unread) }) : t('bell')}
      panelLabel={t('title')}
      panelClassName="w-80 max-w-[calc(100vw-2rem)] p-3"
      buttonClassName="relative grid size-10 place-items-center rounded-full bg-surface text-lg hover:bg-sand-300"
      button={
        <>
          <Icon name="bell" />
          {unread ? (
            <span
              aria-hidden="true"
              className="absolute -end-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[0.7rem] font-bold text-on-primary ring-2 ring-canvas"
            >
              {unread > 9 ? '9+' : unread}
            </span>
          ) : null}
        </>
      }
    >
      {(close) => (
        <>
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <h2 className="text-lg">{t('title')}</h2>
            {unread ? (
              <button
                type="button"
                className="rounded-full px-2 py-1 text-sm font-bold text-brand-text hover:bg-brand/10"
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
                        close();
                        if (!item.read) {
                          void api
                            .POST('/v1/notifications/read', { body: { ids: [item.id] } })
                            .then(load)
                            .catch(() => undefined);
                        }
                      }}
                      className={clsx(
                        'flex gap-3 rounded-row px-3 py-2.5 text-sm hover:bg-raised',
                        !item.read && 'bg-raised font-semibold',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={clsx(
                          'mt-1.5 size-2 shrink-0 rounded-full',
                          item.read ? 'bg-transparent' : 'bg-brand',
                        )}
                      />
                      <span className="min-w-0">
                        <bdi>{text}</bdi>
                        <span className="mt-0.5 block text-xs font-normal text-muted">
                          {format.relativeTime(new Date(item.createdAt), new Date())}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </Popover>
  );
}
