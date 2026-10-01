'use client';

import type { components } from '@kcp/api-client-ts';
import { LEAGUE_TIERS, type LeagueTier } from '@kcp/shared';
import { clsx } from 'clsx';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Alert, Avatar, Button, buttonClass, Icon, PageSpinner } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { useAccount } from '@/lib/use-account';

type League = components['schemas']['LeagueDto'];

/**
 * Each league's colour, for its medal (the tier's name always sits next to it). The
 * medals keep dark ink in dark mode too: they are pictures.
 */
export const LEAGUE_COLOURS: Record<LeagueTier, string> = {
  bronze: '#d9a27a',
  silver: '#c9ccd3',
  gold: '#f0c75e',
  sapphire: '#8fb2ec',
  ruby: '#ee9aa6',
  emerald: '#8fd1b0',
  diamond: '#bfe6f3',
};

export function LeagueMedal({ tier, className }: { tier: LeagueTier; className?: string }) {
  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: LEAGUE_COLOURS[tier], color: '#201e1d' }}
      className={clsx('grid shrink-0 place-items-center rounded-full', className)}
    >
      <Icon name="trophy" />
    </span>
  );
}

/** "2026-10-05" as a date, whatever the viewer's time zone. */
const asDate = (day: string) => new Date(`${day}T00:00:00Z`);

/** The student's league this week: their group, who moves up and down, last week's result. */
export function LeaguePage() {
  const t = useTranslations('league');
  const format = useFormatter();
  const user = useAccount('STUDENT');
  const [league, setLeague] = useState<League | null>(null);
  const [failed, setFailed] = useState(false);
  const [resultSeen, setResultSeen] = useState(false);

  useEffect(() => {
    if (!user) return;
    api
      .GET('/v1/league')
      .then(({ data }) => (data ? setLeague(data) : setFailed(true)))
      .catch(() => setFailed(true));
  }, [user]);

  if (!user || (!league && !failed)) return <PageSpinner />;
  if (!league) return <Alert tone="error">{t('loadFailed')}</Alert>;

  const tierName = (tier: LeagueTier) => t(`tiers.${tier}`);
  const index = league.tierIndex;
  const above = LEAGUE_TIERS[index + 1];
  const below = LEAGUE_TIERS[index - 1];
  const result = !resultSeen ? league.lastResult : null;
  const endDate = format.dateTime(asDate(league.week.endDay), {
    dateStyle: 'full',
    timeZone: 'UTC',
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-wrap items-center gap-5">
        <LeagueMedal tier={league.tier} className="size-18 text-4xl" />
        <div className="flex-1">
          <p className="text-xs font-bold tracking-[0.1em] text-brand-text uppercase">
            {t('title')}
          </p>
          <h1 className="text-4xl">{t('tierName', { tier: tierName(league.tier) })}</h1>
          <p className="mt-1.5 text-muted">{t('subtitle')}</p>
        </div>
      </header>

      {result ? (
        <div
          role="status"
          className={clsx(
            'flex flex-wrap items-center gap-4 rounded-card p-5',
            result.outcome === 'RELEGATED' ? 'bg-sand-200' : 'bg-sage-100 text-sage-800',
          )}
        >
          <LeagueMedal tier={result.newTier} className="size-12 text-2xl" />
          <p className="flex-1 font-semibold">
            {t(
              result.outcome === 'PROMOTED'
                ? 'resultPromoted'
                : result.outcome === 'RELEGATED'
                  ? 'resultRelegated'
                  : 'resultStayed',
              {
                rank: String(result.rank),
                tier: tierName(result.tier),
                newTier: tierName(result.newTier),
              },
            )}
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              setResultSeen(true);
              void api.POST('/v1/league/seen').catch(() => undefined);
            }}
          >
            {t('ok')}
          </Button>
        </div>
      ) : null}

      {!league.joined ? (
        <p className="rounded-card border-2 border-dashed border-line px-6 py-10 text-center text-muted">
          {t('notJoined')}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            {league.promoteCount > 0 && above ? (
              <li className="flex items-center gap-1.5">
                <Icon name="chevU" className="text-sage-700" />
                {t('zoneUp', { count: String(league.promoteCount), tier: tierName(above) })}
              </li>
            ) : (
              <li>{t('topTier')}</li>
            )}
            {league.relegateCount > 0 && below ? (
              <li className="flex items-center gap-1.5">
                <Icon name="chevD" className="text-danger-text" />
                {t('zoneDown', { count: String(league.relegateCount), tier: tierName(below) })}
              </li>
            ) : null}
          </ul>
          <table className="w-full border-separate border-spacing-y-1.5 text-start">
            <thead className="text-sm text-muted">
              <tr>
                <th scope="col" className="w-16 px-3 text-start font-semibold">
                  {t('rank')}
                </th>
                <th scope="col" className="px-3 text-start font-semibold">
                  {t('player')}
                </th>
                <th scope="col" className="w-24 px-3 text-end font-semibold">
                  {t('xp')}
                </th>
              </tr>
            </thead>
            <tbody>
              {league.standings.map((row) => (
                <tr
                  key={row.rank}
                  aria-current={row.isMe ? 'true' : undefined}
                  className={row.isMe ? 'bg-brand-100' : 'bg-surface'}
                >
                  <td
                    className={clsx(
                      'rounded-s-full py-2 ps-4 pe-3',
                      // Who moves up or down, at the row's start edge (right in Arabic and Urdu).
                      row.zone === 'up' && 'border-s-4 border-sage-600',
                      row.zone === 'down' && 'border-s-4 border-danger',
                    )}
                  >
                    <span className="grid size-9 place-items-center rounded-full font-display text-lg">
                      {row.rank}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {row.avatarKey ? (
                        <Avatar avatarKey={row.avatarKey} size="sm" />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="grid size-9 place-items-center rounded-full bg-sand-300 text-muted"
                        >
                          <Icon name="user" />
                        </span>
                      )}
                      <span className={clsx('font-semibold', !row.nickname && 'text-muted')}>
                        {row.nickname ? <bdi>{row.nickname}</bdi> : t('hiddenPlayer')}
                      </span>
                      {row.isMe ? (
                        <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-on-primary">
                          {t('you')}
                        </span>
                      ) : null}
                      {row.isFriend ? (
                        <span className="rounded-full bg-sage-200 px-2.5 py-0.5 text-xs font-bold text-sage-800">
                          {t('friend')}
                        </span>
                      ) : null}
                      {row.zone ? (
                        <span className="sr-only">
                          {row.zone === 'up' ? t('upZone') : t('downZone')}
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className="rounded-e-full py-2 ps-3 pe-5 text-end font-bold">{row.xp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-sm text-muted">
        {t('ends', { date: endDate })} {t('safety')}
      </p>
      <Link href="/learn/leaderboard" className={`${buttonClass('secondary', 'sm')} self-start`}>
        <Icon name="globe" />
        {t('allBoards')}
      </Link>
    </div>
  );
}
