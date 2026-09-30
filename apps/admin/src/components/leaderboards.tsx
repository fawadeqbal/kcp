'use client';

import type { components } from '@kcp/api-client-ts';
import { BOARD_PERIODS, BOARD_SCOPES, type BoardPeriod, type BoardScope } from '@kcp/shared';
import { Alert, Badge, Button, Card, Dialog, SelectField, TextField } from '@kcp/ui';
import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import { useAction } from '@/lib/action';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate, formatDateTime, humanize } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { Cell, Table } from './data';
import { PageHeader } from './shell';

type Season = components['schemas']['SeasonAdminDto'];
type Region = components['schemas']['RegionDto'];

const PERIOD_LABELS: Record<BoardPeriod, string> = {
  week: 'This week',
  season: 'Current season',
  all: 'All time',
};
const SCOPE_LABELS: Record<BoardScope, string> = {
  global: 'Whole world',
  country: 'Country',
  region: 'Region',
  city: 'City',
};

/** "2026-10-05" as a date, whatever the viewer's time zone. */
const plainDate = (day: string) => formatDate(new Date(`${day}T12:00:00Z`));
/** Seasons store the day after their last day. */
const lastDay = (endDay: string) =>
  plainDate(
    new Date(new Date(`${endDay}T12:00:00Z`).getTime() - 86_400_000).toISOString().slice(0, 10),
  );

/** Leaderboards and seasons: look at any board, run seasons, see past winners. */
export function Leaderboards() {
  const { state } = useAuth();
  const ability = state.status === 'authenticated' ? state.ability : null;
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <>
      <PageHeader
        title="Leaderboards"
        description="Boards update within seconds of a student earning XP, and are rebuilt from the database every night at 02:30 UTC. Weeks end at Monday 00:00 in each country’s time zone. Region and city boards open once enough students there are on public boards."
      />
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      <BoardViewer
        canRebuild={ability?.can('update', 'LeaderboardSeason') ?? false}
        onDone={setNotice}
      />
      <Seasons
        canStart={ability?.can('create', 'LeaderboardSeason') ?? false}
        canEnd={ability?.can('update', 'LeaderboardSeason') ?? false}
        onDone={setNotice}
      />
      <Results />
    </>
  );
}

function BoardViewer({
  canRebuild,
  onDone,
}: {
  canRebuild: boolean;
  onDone: (message: string) => void;
}) {
  const [period, setPeriod] = useState<BoardPeriod>('week');
  const [scope, setScope] = useState<BoardScope>('global');
  const [country, setCountry] = useState('PK');
  const [regionId, setRegionId] = useState('');
  const [cityId, setCityId] = useState('');
  const countries = useLoad(() => api.GET('/v1/countries'), 'countries');
  const regions = useLoad(
    () => api.GET('/v1/countries/{code}/regions', { params: { path: { code: country } } }),
    country,
  );
  const scopeId =
    scope === 'global'
      ? undefined
      : scope === 'country'
        ? country
        : scope === 'region'
          ? regionId
          : cityId;
  const board = useLoad(
    () =>
      api.GET('/v1/admin/leaderboards', {
        params: { query: { period, scope, ...(scopeId ? { scopeId } : {}) } },
      }),
    `${period}|${scope}|${scopeId ?? ''}`,
  );
  const rebuild = useAction();
  const regionList: Region[] = regions.data ?? [];
  const cities = regionList.find((r) => r.id === regionId)?.cities ?? [];
  const needsArea = (scope === 'region' && !regionId) || (scope === 'city' && !cityId);

  async function onRebuild() {
    if (await rebuild.run(() => api.POST('/v1/admin/leaderboards/rebuild'))) {
      board.reload();
      onDone('Every current board was rebuilt from the database.');
    }
  }

  return (
    <Card
      title="Boards"
      actions={
        canRebuild ? (
          <Button size="sm" variant="secondary" onClick={onRebuild} loading={rebuild.busy}>
            Rebuild from database
          </Button>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        {rebuild.error ? <Alert tone="error">{rebuild.error}</Alert> : null}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <SelectField
            label="Period"
            value={period}
            onChange={(e) => setPeriod(e.target.value as BoardPeriod)}
          >
            {BOARD_PERIODS.map((p) => (
              <option key={p} value={p}>
                {PERIOD_LABELS[p]}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Board"
            value={scope}
            onChange={(e) => setScope(e.target.value as BoardScope)}
          >
            {BOARD_SCOPES.map((s) => (
              <option key={s} value={s}>
                {SCOPE_LABELS[s]}
              </option>
            ))}
          </SelectField>
          {scope !== 'global' ? (
            <SelectField
              label="Country"
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setRegionId('');
                setCityId('');
              }}
            >
              {(countries.data ?? []).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.names['en'] ?? c.code}
                </option>
              ))}
            </SelectField>
          ) : null}
          {scope === 'region' || scope === 'city' ? (
            <SelectField
              label="Region"
              value={regionId}
              onChange={(e) => {
                setRegionId(e.target.value);
                setCityId('');
              }}
            >
              <option value="">Choose…</option>
              {regionList.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.names['en'] ?? r.slug}
                </option>
              ))}
            </SelectField>
          ) : null}
          {scope === 'city' ? (
            <SelectField label="City" value={cityId} onChange={(e) => setCityId(e.target.value)}>
              <option value="">Choose…</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.names['en'] ?? c.slug}
                </option>
              ))}
            </SelectField>
          ) : null}
        </div>

        {board.error ? <Alert tone="error">{board.error}</Alert> : null}
        {needsArea ? (
          <p className="text-muted">Choose a {scope} to see its board.</p>
        ) : board.data ? (
          <>
            <p className="text-sm text-muted">
              {board.data.periodKey
                ? `Period: ${board.data.periodKey === 'all' ? 'all time' : board.data.periodKey}. `
                : 'No season is running. '}
              {board.data.areaSize !== null
                ? `${board.data.areaSize} students here are on public boards; students see this board from ${board.data.minStudents}.`
                : null}
            </p>
            <Table
              bare
              caption="Board"
              columns={['Rank', 'Nickname', 'Username', 'XP']}
              empty={board.data.entries.length === 0}
            >
              {board.data.entries.map((entry) => (
                <tr key={entry.userId}>
                  <Cell className="font-semibold">{entry.rank}</Cell>
                  <Cell>
                    <Link
                      href={`/users/${entry.userId}`}
                      className="font-semibold text-brand-text underline-offset-4 hover:underline"
                    >
                      {entry.nickname}
                    </Link>
                  </Cell>
                  <Cell className="font-latin">{entry.username ?? '—'}</Cell>
                  <Cell>{entry.xp}</Cell>
                </tr>
              ))}
            </Table>
          </>
        ) : (
          <p className="text-muted">Loading…</p>
        )}
      </div>
    </Card>
  );
}

function Seasons({
  canStart,
  canEnd,
  onDone,
}: {
  canStart: boolean;
  canEnd: boolean;
  onDone: (message: string) => void;
}) {
  const seasons = useLoad(() => api.GET('/v1/admin/seasons'), 'seasons');
  const [ending, setEnding] = useState<Season | null>(null);
  const running = seasons.data?.seasons.find((s) => s.status === 'ACTIVE') ?? null;

  return (
    <Card title="Seasons">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          A season is a longer contest with its own board. One runs at a time. When it ends (on its
          planned date, or when you end it), its final top 10s are kept.
        </p>
        {seasons.error ? <Alert tone="error">{seasons.error}</Alert> : null}
        {seasons.data ? (
          <Table
            bare
            caption="Seasons"
            columns={['Name', 'Dates', 'Status', '']}
            empty={seasons.data.seasons.length === 0}
          >
            {seasons.data.seasons.map((season) => (
              <tr key={season.id}>
                <Cell className="font-semibold">{season.name}</Cell>
                <Cell>
                  {plainDate(season.startDay)} –{' '}
                  {season.endDay ? lastDay(season.endDay) : 'no end date'}
                </Cell>
                <Cell>
                  <Badge tone={season.status === 'ACTIVE' ? 'success' : 'neutral'}>
                    {humanize(season.status)}
                  </Badge>
                  {season.endedAt ? (
                    <span className="ms-2 text-sm text-muted">
                      {formatDateTime(season.endedAt)}
                    </span>
                  ) : null}
                </Cell>
                <Cell>
                  {canEnd && season.status === 'ACTIVE' ? (
                    <Button size="sm" variant="danger" onClick={() => setEnding(season)}>
                      End now
                    </Button>
                  ) : null}
                </Cell>
              </tr>
            ))}
          </Table>
        ) : (
          <p className="text-muted">Loading…</p>
        )}
        {canStart && seasons.data && !running ? (
          <StartSeason
            onStarted={(name) => {
              seasons.reload();
              onDone(`Season “${name}” started.`);
            }}
          />
        ) : null}
      </div>
      {ending ? (
        <EndSeasonDialog
          season={ending}
          onClose={() => setEnding(null)}
          onEnded={() => {
            setEnding(null);
            seasons.reload();
            onDone(`Season “${ending.name}” ended. Its final top 10s are under Results.`);
          }}
        />
      ) : null}
    </Card>
  );
}

function StartSeason({ onStarted }: { onStarted: (name: string) => void }) {
  const [name, setName] = useState('');
  const [startDay, setStartDay] = useState('');
  const [endDay, setEndDay] = useState('');
  const [nameError, setNameError] = useState<string>();
  const action = useAction();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length < 3) {
      setNameError('Give the season a name (at least 3 characters).');
      return;
    }
    setNameError(undefined);
    const ok = await action.run(() =>
      api.POST('/v1/admin/seasons', {
        body: {
          name: name.trim(),
          ...(startDay ? { startDay } : {}),
          // The API stores the day after the last day.
          ...(endDay
            ? {
                endDay: new Date(new Date(`${endDay}T12:00:00Z`).getTime() + 86_400_000)
                  .toISOString()
                  .slice(0, 10),
              }
            : {}),
        },
      }),
    );
    if (ok) {
      onStarted(name.trim());
      setName('');
      setStartDay('');
      setEndDay('');
    }
  }

  return (
    <form className="flex flex-col gap-3 border-t border-line pt-4" onSubmit={onSubmit} noValidate>
      <h3 className="font-semibold">Start a season</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <TextField
          label="Name"
          hint="Students see it, e.g. “Autumn Code Cup”."
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          error={nameError}
        />
        <TextField
          label="First day"
          hint="Empty: today."
          type="date"
          value={startDay}
          onChange={(e) => setStartDay(e.target.value)}
        />
        <TextField
          label="Last day"
          hint="Empty: until you end it."
          type="date"
          value={endDay}
          onChange={(e) => setEndDay(e.target.value)}
        />
      </div>
      {action.error ? <Alert tone="error">{action.error}</Alert> : null}
      <Button type="submit" className="self-start" loading={action.busy}>
        Start season
      </Button>
    </form>
  );
}

function EndSeasonDialog({
  season,
  onClose,
  onEnded,
}: {
  season: Season;
  onClose: () => void;
  onEnded: () => void;
}) {
  const action = useAction();
  async function confirm() {
    const ok = await action.run(() =>
      api.POST('/v1/admin/seasons/{id}/end', { params: { path: { id: season.id } } }),
    );
    if (ok) onEnded();
  }
  return (
    <Dialog open onClose={onClose} title={`End “${season.name}” now?`}>
      <p className="text-muted">
        Today counts in full. The final top 10s are kept, and the season’s boards close. This can’t
        be undone.
      </p>
      {action.error ? <Alert tone="error">{action.error}</Alert> : null}
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" onClick={confirm} loading={action.busy}>
          End season
        </Button>
      </div>
    </Dialog>
  );
}

function Results() {
  const [period, setPeriod] = useState<'WEEK' | 'SEASON'>('WEEK');
  const results = useLoad(
    () => api.GET('/v1/admin/leaderboards/results', { params: { query: { period } } }),
    period,
  );
  return (
    <Card title="Results">
      <div className="flex flex-col gap-4">
        <div className="max-w-xs">
          <SelectField
            label="Show"
            value={period}
            onChange={(e) => setPeriod(e.target.value as 'WEEK' | 'SEASON')}
          >
            <option value="WEEK">Past weeks</option>
            <option value="SEASON">Past seasons</option>
          </SelectField>
        </div>
        {results.error ? <Alert tone="error">{results.error}</Alert> : null}
        {results.data ? (
          results.data.boards.length === 0 ? (
            <p className="text-muted">No results yet.</p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {results.data.boards.map((board) => (
                <section
                  key={`${board.periodKey}|${board.scope}|${board.scopeId}`}
                  className="rounded-row bg-raised p-4"
                >
                  <h3 className="font-semibold">
                    {board.seasonName ?? board.periodKey} ·{' '}
                    {board.scope === 'GLOBAL' ? 'Whole world' : board.scopeId}
                  </h3>
                  <ol className="mt-2 flex flex-col gap-1 text-sm">
                    {board.entries.map((entry) => (
                      <li key={entry.rank} className="flex justify-between gap-3">
                        <span>
                          {entry.rank}.{' '}
                          <Link
                            href={`/users/${entry.userId}`}
                            className="text-brand-text underline-offset-4 hover:underline"
                          >
                            {entry.nickname ?? 'Deleted student'}
                          </Link>
                        </span>
                        <span className="font-semibold">{entry.xp} XP</span>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          )
        ) : (
          <p className="text-muted">Loading…</p>
        )}
      </div>
    </Card>
  );
}
