'use client';

import type { components } from '@kcp/api-client-ts';
import { BADGE_CATEGORIES } from '@kcp/shared';
import { clsx } from 'clsx';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Alert, Icon, PageSpinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useAccount } from '@/lib/use-account';
import { BadgeCelebration, badgeIcon } from './badge-celebration';

type Badge = components['schemas']['BadgeDto'];

/** Every badge, grouped by kind: earned ones in colour, the rest waiting to be earned. */
export function BadgesPage() {
  const t = useTranslations('badges');
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
    <div className="mx-auto flex max-w-300 flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">{t('title')}</h1>
          <p className="mt-1.5 text-lg text-muted">{t('subtitle')}</p>
        </div>
        {badges ? (
          <p className="flex items-center gap-2 rounded-full bg-brand-100 px-4 py-2 font-bold text-brand-800">
            <Icon name="award" />
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
                <h2 id={`badges-${category}`} className="text-2xl">
                  {t(`category${category}`)}
                </h2>
                <ul className="mt-3.5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                  {inCategory.map((badge) => (
                    <li
                      key={badge.key}
                      className={clsx(
                        'flex items-start gap-4 rounded-inner p-4.5',
                        badge.earned ? 'bg-surface' : 'border-2 border-dashed border-line',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={clsx(
                          'grid size-14 shrink-0 place-items-center rounded-full text-3xl',
                          badge.earned ? 'bg-brand-100' : 'bg-sand-200 opacity-55 grayscale',
                        )}
                      >
                        {badgeIcon(badge.key)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold">{name(badge.key)}</p>
                        <p className="text-sm text-muted">{description(badge.key)}</p>
                        <p
                          className={clsx(
                            'mt-1.5 flex items-center gap-1.5 text-xs font-bold',
                            badge.earned ? 'text-sage-text' : 'text-muted',
                          )}
                        >
                          <Icon name={badge.earned ? 'check' : 'lock'} />
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
