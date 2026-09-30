'use client';

import type { components } from '@kcp/api-client-ts';
import { BADGE_CATEGORIES } from '@kcp/shared';
import { clsx } from 'clsx';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Alert, PageSpinner } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { useAccount } from '@/lib/use-account';
import { BadgeCelebration, badgeIcon } from './badge-celebration';

type Badge = components['schemas']['BadgeDto'];

/** Every badge, grouped by kind: earned ones in colour, the rest waiting to be earned. */
export function BadgesPage() {
  const t = useTranslations('badges');
  const tl = useTranslations('lesson');
  const format = useFormatter();
  const user = useAccount('STUDENT');
  const signedIn = user !== null;
  const [badges, setBadges] = useState<Badge[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    api
      .GET('/v1/badges')
      .then(({ data }) => {
        if (cancelled) return;
        if (data) setBadges(data.badges);
        else setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  if (!user) return <PageSpinner />;
  const earned = badges?.filter((b) => b.earned).length ?? 0;
  const name = (key: string) => t(`${key}.name` as 'first-steps.name');
  const description = (key: string) => t(`${key}.description` as 'first-steps.description');

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <nav aria-label={tl('backToLearning')} className="text-sm">
        <Link href="/learn" className="font-semibold text-brand-700 underline underline-offset-4">
          {tl('backToLearning')}
        </Link>
      </nav>
      <header>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="mt-1 text-muted">{t('subtitle')}</p>
        {badges ? (
          <p className="mt-2 font-semibold text-brand-700">
            {t('progress', { earned: String(earned), total: String(badges.length) })}
          </p>
        ) : null}
      </header>
      {failed ? <Alert tone="error">{t('loadFailed')}</Alert> : null}
      {!failed && !badges ? <PageSpinner /> : null}
      {badges
        ? BADGE_CATEGORIES.map((category) => {
            const inCategory = badges.filter((b) => b.category === category);
            if (inCategory.length === 0) return null;
            return (
              <section key={category} aria-labelledby={`badges-${category}`}>
                <h2 id={`badges-${category}`} className="text-xl font-bold">
                  {t(`category${category}`)}
                </h2>
                <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {inCategory.map((badge) => (
                    <li
                      key={badge.key}
                      className={clsx(
                        'flex items-start gap-4 rounded-[var(--radius-card)] border p-4',
                        badge.earned ? 'border-accent/50 bg-surface' : 'border-line bg-canvas',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={clsx(
                          'grid size-14 shrink-0 place-items-center rounded-full text-3xl',
                          badge.earned ? 'bg-accent/25' : 'bg-line/50 opacity-50 grayscale',
                        )}
                      >
                        {badgeIcon(badge.key)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold">{name(badge.key)}</p>
                        <p className="text-sm text-muted">{description(badge.key)}</p>
                        <p
                          className={clsx(
                            'mt-1 text-xs font-semibold',
                            badge.earned ? 'text-success' : 'text-muted',
                          )}
                        >
                          {badge.earned && badge.awardedAt
                            ? t('earnedOn', {
                                date: format.dateTime(new Date(badge.awardedAt), {
                                  dateStyle: 'medium',
                                }),
                              })
                            : t('locked')}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        : null}
      <BadgeCelebration keys={badges?.filter((b) => b.earned && !b.seen).map((b) => b.key) ?? []} />
    </div>
  );
}
