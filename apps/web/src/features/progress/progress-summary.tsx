'use client';

import type { components } from '@kcp/api-client-ts';
import { clsx } from 'clsx';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Alert, buttonClass } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { UnseenBadges } from '../badges/badge-celebration';

type Progress = components['schemas']['ProgressDto'];

/** Western digits everywhere, like the rest of the app (and the code students write). */
const number = (value: number) => String(value);

/** A bar with an accessible name and value (the numbers are shown next to it too). */
export function Meter({
  value,
  max,
  label,
  tone = 'brand',
}: {
  value: number;
  max: number;
  label: string;
  tone?: 'brand' | 'success';
}) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 100;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
      className="h-3 overflow-hidden rounded-full bg-line/60"
    >
      <div
        className={clsx(
          'h-full rounded-full motion-safe:transition-[width]',
          tone === 'brand' ? 'bg-brand-600' : 'bg-success',
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

/** Level and XP, today's goal and streak, and this week's rank — the top of the student's home. */
export function ProgressSummary() {
  const t = useTranslations('progress');
  const tn = useTranslations('nav');
  const [progress, setProgress] = useState<Progress | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .GET('/v1/progress')
      .then(({ data }) => {
        if (cancelled) return;
        if (data) setProgress(data);
        else setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) return <Alert tone="error">{t('loadFailed')}</Alert>;
  if (!progress)
    return <div className="h-40 rounded-[var(--radius-card)] bg-surface" aria-hidden />;

  const { level, today, streak, week } = progress;
  const levelSpan = level.nextMinXp === null ? 1 : level.nextMinXp - level.minXp;
  const inLevel = progress.xpTotal - level.minXp;

  return (
    <section aria-labelledby="progress-heading" className="grid gap-4 md:grid-cols-3">
      <h2 id="progress-heading" className="sr-only">
        {t('title')}
      </h2>

      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-2xl font-bold text-brand-700">
            {t('level', { level: number(level.number) })}
          </p>
          <p className="font-semibold">{t('xp', { xp: number(progress.xpTotal) })}</p>
        </div>
        <div className="mt-3">
          <Meter
            value={level.nextMinXp === null ? 1 : inLevel}
            max={levelSpan}
            label={t('xpBarLabel', { level: number(level.number + 1) })}
          />
        </div>
        <p className="mt-2 text-sm text-muted">
          {level.nextMinXp === null
            ? t('topLevel')
            : t('toNext', {
                xp: number(level.nextMinXp - progress.xpTotal),
                level: number(level.number + 1),
              })}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
          <p className="text-sm">
            <span className="font-semibold">{t('badges')}</span>{' '}
            <span className="text-muted">
              {t('badgesValue', {
                earned: number(progress.badges.earned),
                total: number(progress.badges.total),
              })}
            </span>
          </p>
          <Link href="/learn/badges" className={buttonClass('secondary', 'sm')}>
            {t('seeBadges')}
          </Link>
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-semibold">{t('today')}</p>
          <p className="text-sm text-muted">
            {t('todayValue', { xp: number(today.xp), goal: number(today.goalXp) })}
          </p>
        </div>
        <div className="mt-3">
          <Meter value={today.xp} max={today.goalXp} label={t('today')} tone="success" />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span
            className={clsx(
              'grid size-12 shrink-0 place-items-center rounded-full text-xl font-bold',
              streak.current > 0 ? 'bg-accent/25 text-ink' : 'bg-line/60 text-muted',
            )}
          >
            {number(streak.current)}
          </span>
          <div>
            <p className="font-semibold">{t('streak')}</p>
            <p className="text-sm text-muted">
              {today.capReached
                ? t('capReached')
                : streak.doneToday
                  ? t('goalDone')
                  : streak.freezesNeeded > 0
                    ? t('freezeNeeded')
                    : t('streakHelp')}
            </p>
          </div>
        </div>
        <p className="mt-3 text-sm" title={t('freezesHelp')}>
          <span aria-hidden="true">❄️ </span>
          {t('freezes', { count: number(streak.freezes) })}
          <span className="sr-only"> — {t('freezesHelp')}</span>
        </p>
      </div>

      <div className="flex flex-col rounded-[var(--radius-card)] border border-line bg-surface p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-semibold">{t('week')}</p>
          <p className="text-sm text-muted">{t('xp', { xp: number(week.xp) })}</p>
        </div>
        <div className="mt-2 flex-1 text-sm">
          {week.hidden ? (
            <p className="text-muted">{t('weekHidden')}</p>
          ) : week.globalRank ? (
            <ul className="flex flex-col gap-1">
              <li className="text-lg font-bold">
                {t('weekRank', { rank: number(week.globalRank) })}
              </li>
              {week.countryRank ? (
                <li className="font-semibold text-muted">
                  {t('weekCountryRank', { rank: number(week.countryRank) })}
                </li>
              ) : null}
              {week.regionRank ? (
                <li className="text-muted">
                  {t('weekRegionRank', { rank: number(week.regionRank) })}
                </li>
              ) : null}
              {week.cityRank ? (
                <li className="text-muted">{t('weekCityRank', { rank: number(week.cityRank) })}</li>
              ) : null}
            </ul>
          ) : (
            <p className="text-muted">{t('weekNoRank')}</p>
          )}
        </div>
        {progress.season ? (
          <p className="mt-2 text-sm font-semibold text-brand-700">
            {t('season', { name: progress.season.name })}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/learn/leaderboard" className={buttonClass('secondary', 'sm')}>
            {tn('leaderboard')}
          </Link>
          <Link href="/learn/portfolio" className={buttonClass('secondary', 'sm')}>
            {tn('portfolio')}
          </Link>
        </div>
      </div>
      <UnseenBadges count={progress.badges.unseen} />
    </section>
  );
}
