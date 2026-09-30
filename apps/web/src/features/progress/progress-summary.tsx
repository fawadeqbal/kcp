'use client';

import type { components } from '@kcp/api-client-ts';
import { clsx } from 'clsx';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Alert, Badge, buttonClass, Icon, Meter } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { UnseenBadges } from '../badges/badge-celebration';

type Progress = components['schemas']['ProgressDto'];

/** Western digits everywhere, like the rest of the app (and the code students write). */
const number = (value: number) => String(value);

const card = 'flex flex-col gap-3 rounded-card bg-surface p-6';

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
  if (!progress) return <div className="h-56 rounded-card bg-surface" aria-hidden />;

  const { level, today, streak, week } = progress;
  const levelSpan = level.nextMinXp === null ? 1 : level.nextMinXp - level.minXp;
  const inLevel = progress.xpTotal - level.minXp;

  return (
    <section aria-labelledby="progress-heading" className="grid gap-4.5 md:grid-cols-3">
      <h2 id="progress-heading" className="sr-only">
        {t('title')}
      </h2>

      <div className={card}>
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-display text-3xl text-brand-text">
            {t('level', { level: number(level.number) })}
          </p>
          <p className="font-bold">{t('xp', { xp: number(progress.xpTotal) })}</p>
        </div>
        <Meter
          value={level.nextMinXp === null ? 1 : inLevel}
          max={levelSpan}
          label={t('xpBarLabel', { level: number(level.number + 1) })}
        />
        <p className="text-sm text-muted">
          {level.nextMinXp === null
            ? t('topLevel')
            : t('toNext', {
                xp: number(level.nextMinXp - progress.xpTotal),
                level: number(level.number + 1),
              })}
        </p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-row bg-raised py-2 ps-4 pe-2 sm:rounded-full">
          <p className="flex items-center gap-2 text-sm">
            <Icon name="award" className="text-base text-brand" />
            <span className="font-bold">{t('badges')}</span>
            <span className="text-muted">
              {t('badgesValue', {
                earned: number(progress.badges.earned),
                total: number(progress.badges.total),
              })}
            </span>
          </p>
          <Link
            href="/learn/badges"
            className="flex min-h-9 items-center gap-1 rounded-full px-3 text-sm font-bold text-brand-text hover:bg-brand/10"
          >
            {t('seeBadges')}
            <Icon name="chevR" className="text-sm" />
          </Link>
        </div>
      </div>

      <div className={card}>
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-bold">{t('today')}</p>
          <p className="text-sm text-muted">
            {t('todayValue', { xp: number(today.xp), goal: number(today.goalXp) })}
          </p>
        </div>
        <Meter value={today.xp} max={today.goalXp} label={t('today')} tone="sage" />
        <div className="mt-1 flex items-center gap-3.5">
          <span
            className={clsx(
              'relative grid size-14 shrink-0 place-items-center rounded-full font-display text-2xl',
              streak.current > 0 ? 'bg-brand-200 text-brand-800' : 'bg-sand-200 text-muted',
            )}
          >
            {number(streak.current)}
            <span
              aria-hidden="true"
              className={clsx(
                'absolute -end-1 -bottom-1 grid size-6 place-items-center rounded-full text-[0.8rem] ring-2 ring-surface',
                streak.current > 0 ? 'bg-brand text-on-primary' : 'bg-sand-300 text-muted',
              )}
            >
              <Icon name="flame" />
            </span>
          </span>
          <div>
            <p className="font-bold">{t('streak')}</p>
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
        <p className="mt-auto flex items-center gap-2 text-sm text-muted" title={t('freezesHelp')}>
          <Icon name="snow" className="text-[0.95rem] text-sage" />
          {t('freezes', { count: number(streak.freezes) })}
          <span className="sr-only"> — {t('freezesHelp')}</span>
        </p>
      </div>

      <div className={card}>
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-bold">{t('week')}</p>
          <p className="text-sm text-muted">{t('xp', { xp: number(week.xp) })}</p>
        </div>
        <div className="flex-1 text-sm">
          {week.hidden ? (
            <p className="text-muted">{t('weekHidden')}</p>
          ) : week.globalRank ? (
            <>
              <p className="font-display text-3xl">
                {t('weekRank', { rank: number(week.globalRank) })}
              </p>
              <ul className="mt-2.5 flex flex-wrap gap-2">
                {week.countryRank ? (
                  <li>
                    <Badge>{t('weekCountryRank', { rank: number(week.countryRank) })}</Badge>
                  </li>
                ) : null}
                {week.regionRank ? (
                  <li>
                    <Badge>{t('weekRegionRank', { rank: number(week.regionRank) })}</Badge>
                  </li>
                ) : null}
                {week.cityRank ? (
                  <li>
                    <Badge>{t('weekCityRank', { rank: number(week.cityRank) })}</Badge>
                  </li>
                ) : null}
                {progress.season ? (
                  <li>
                    <Badge tone="success">{t('season', { name: progress.season.name })}</Badge>
                  </li>
                ) : null}
              </ul>
            </>
          ) : (
            <p className="text-muted">{t('weekNoRank')}</p>
          )}
        </div>
        {progress.season && (week.hidden || !week.globalRank) ? (
          <p className="text-sm font-semibold text-sage-text">
            {t('season', { name: progress.season.name })}
          </p>
        ) : null}
        <div className="mt-auto flex flex-wrap gap-2">
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
