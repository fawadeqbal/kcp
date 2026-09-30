'use client';

import type { components } from '@kcp/api-client-ts';
import { BOARD_PERIODS, BOARD_SCOPES, type BoardPeriod, type BoardScope } from '@kcp/shared';
import { clsx } from 'clsx';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Alert, Avatar, PageSpinner } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { useAccount } from '@/lib/use-account';
import { onTabKeyDown } from '../learn/tabs';

type Board = components['schemas']['LeaderboardDto'];

/** Plain dates ("2026-10-05") shown as they are, whatever the viewer's time zone. */
const asDate = (day: string) => new Date(`${day}T00:00:00Z`);
/** Seasons store the day after their last day. */
const dayBefore = (day: string) =>
  new Date(asDate(day).getTime() - 86_400_000).toISOString().slice(0, 10);

/** One row of pill-shaped tabs (ARIA tabs, arrow keys mirror in right-to-left). */
function PillTabs<T extends string>({
  label,
  options,
  value,
  onChange,
  text,
  idPrefix,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  text: (value: T) => string;
  idPrefix: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option, index) => (
        <button
          key={option}
          id={`${idPrefix}-${option}`}
          type="button"
          role="tab"
          aria-selected={value === option}
          aria-controls="board-panel"
          tabIndex={value === option ? 0 : -1}
          onClick={() => onChange(option)}
          onKeyDown={(event) =>
            onTabKeyDown(event, options.length, index, (i) => onChange(options[i]!))
          }
          className={clsx(
            'min-h-11 rounded-full border px-5 font-semibold',
            value === option
              ? 'border-brand-600 bg-brand-600 text-white'
              : 'border-line bg-surface hover:border-brand-600',
          )}
        >
          {text(option)}
        </button>
      ))}
    </div>
  );
}

/** Leaderboards: this week, the season or all time; the world, country, region or city. */
export function LeaderboardPage() {
  const t = useTranslations('leaderboard');
  const tl = useTranslations('lesson');
  const format = useFormatter();
  const locale = useLocale();
  const user = useAccount('STUDENT');
  const signedIn = user !== null;
  const [period, setPeriod] = useState<BoardPeriod>('week');
  const [scope, setScope] = useState<BoardScope>('global');
  const [board, setBoard] = useState<Board | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    setBoard(null);
    setFailed(false);
    api
      .GET('/v1/leaderboards', { params: { query: { scope, period, lang: locale } } })
      .then(({ data }) => {
        if (cancelled) return;
        if (data) setBoard(data);
        else setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn, scope, period, locale]);

  if (!user) return <PageSpinner />;
  const fullDate = (day: string) =>
    format.dateTime(asDate(day), { dateStyle: 'full', timeZone: 'UTC' });

  let unavailable: string | null = null;
  if (board && !board.available) {
    if (period === 'season' && !board.season) unavailable = t('noSeason');
    else if (scope === 'region' || scope === 'city') {
      unavailable =
        board.areaName === null
          ? t('noArea')
          : t('areaClosed', { area: board.areaName, min: String(board.minStudents) });
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <nav aria-label={tl('backToLearning')} className="text-sm">
        <Link href="/learn" className="font-semibold text-brand-700 underline underline-offset-4">
          {tl('backToLearning')}
        </Link>
      </nav>
      <header>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="mt-1 text-muted">
          {period === 'season' && board?.season
            ? t('subtitleSeason', { name: board.season.name })
            : period === 'all'
              ? t('subtitleAll')
              : t('subtitle')}
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <PillTabs
          label={t('periods')}
          options={BOARD_PERIODS}
          value={period}
          onChange={setPeriod}
          text={(value) => t(value)}
          idPrefix="period-tab"
        />
        <PillTabs
          label={t('scopes')}
          options={BOARD_SCOPES}
          value={scope}
          onChange={setScope}
          text={(value) => t(value)}
          idPrefix="board-tab"
        />
      </div>

      <div id="board-panel" role="tabpanel" aria-labelledby={`board-tab-${scope}`}>
        {failed ? <Alert tone="error">{t('loadFailed')}</Alert> : null}
        {!failed && !board ? <PageSpinner /> : null}
        {board && unavailable ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-muted">
            {unavailable}
          </p>
        ) : null}
        {board && !unavailable ? (
          <div className="flex flex-col gap-4">
            <p
              className={clsx(
                'rounded-xl px-4 py-3',
                board.me.hidden ? 'bg-line/40 text-ink' : 'bg-brand-50 font-semibold',
              )}
            >
              {board.me.hidden
                ? t('hidden', { xp: String(board.me.xp) })
                : board.me.rank
                  ? t('yourRank', { rank: String(board.me.rank), xp: String(board.me.xp) })
                  : t('notRanked', { xp: String(board.me.xp) })}
            </p>

            {board.entries.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-muted">
                {t('empty')}
              </p>
            ) : (
              <table className="w-full border-separate border-spacing-y-1 text-start">
                <thead className="text-sm text-muted">
                  <tr>
                    <th scope="col" className="w-16 px-3 text-start font-semibold">
                      {t('rank')}
                    </th>
                    <th scope="col" className="px-3 text-start font-semibold">
                      {t('student')}
                    </th>
                    <th scope="col" className="w-24 px-3 text-end font-semibold">
                      {t('xp')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {board.entries.map((entry) => (
                    <tr
                      key={`${entry.rank}-${entry.nickname}`}
                      className={clsx(entry.isMe ? 'bg-brand-50' : 'bg-surface')}
                      aria-current={entry.isMe ? 'true' : undefined}
                    >
                      <td className="rounded-s-xl px-3 py-2 text-lg font-bold">{entry.rank}</td>
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-3">
                          <Avatar avatarKey={entry.avatarKey} size="sm" />
                          <span className="font-latin font-semibold">
                            <bdi>{entry.nickname}</bdi>
                          </span>
                          {entry.isMe ? (
                            <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">
                              {t('you')}
                            </span>
                          ) : null}
                        </span>
                      </td>
                      <td className="rounded-e-xl px-3 py-2 text-end font-semibold">{entry.xp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="text-sm text-muted">
              {board.week
                ? `${t('resets', { date: fullDate(board.week.endDay) })} · `
                : board.season
                  ? `${
                      board.season.endDay
                        ? t('seasonEnds', { date: fullDate(dayBefore(board.season.endDay)) })
                        : t('seasonOpen')
                    } · `
                  : ''}
              {t('safety')}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
