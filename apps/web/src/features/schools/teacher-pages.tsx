'use client';

import type { components } from '@kcp/api-client-ts';
import { useFormatter, useTranslations } from 'next-intl';
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { BackLink } from '@/components/back-link';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  buttonClass,
  Card,
  Dialog,
  Icon,
  PageSpinner,
  SelectField,
  TextField,
} from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { api, errorCode } from '@/lib/api';
import { errorMessageKey } from '@/lib/errors';
import { useAccount } from '@/lib/use-account';
import { isolate } from '../auth/validation';
import { ClassBoard } from './classes-page';

type Home = components['schemas']['TeacherHomeDto'];
type TeacherClass = components['schemas']['TeacherClassDto'];
type Catalog = components['schemas']['CatalogTrackDto'];
type Student = components['schemas']['ClassStudentDto'];
type Notice = { tone: 'success' | 'error'; text: string };

const STATE_TONE = { DONE: 'success', STARTED: 'warning', NOT_STARTED: 'neutral' } as const;

function useNotice() {
  const te = useTranslations('errors');
  const [notice, setNotice] = useState<Notice | null>(null);
  const fail = (error: unknown) =>
    setNotice({ tone: 'error', text: te(errorMessageKey(errorCode(error))) });
  return { notice, setNotice, fail };
}

function NoticeArea({ notice }: { notice: Notice | null }) {
  return (
    <div aria-live="polite">
      {notice ? (
        <Alert tone={notice.tone} live={false}>
          {notice.text}
        </Alert>
      ) : null}
    </div>
  );
}

/** A teacher's classes at their schools, and making a new one. */
export function TeacherHomePage() {
  const t = useTranslations('teacher');
  const user = useAccount('TEACHER');
  const [home, setHome] = useState<Home | null>(null);
  const [failed, setFailed] = useState(false);
  const [schoolId, setSchoolId] = useState('');
  const [name, setName] = useState('');
  const [trackId, setTrackId] = useState('');
  const [busy, setBusy] = useState(false);
  const { notice, setNotice, fail } = useNotice();

  const load = useCallback(async () => {
    try {
      const { data } = await api.GET('/v1/teacher/classes');
      if (data) {
        setHome(data);
        setSchoolId((current) => current || data.schools[0]?.id || '');
      } else setFailed(true);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  async function make(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const { data, error } = await api.POST('/v1/teacher/classes', {
        body: { schoolId, name: name.trim(), trackId: trackId || null },
      });
      if (data) {
        setNotice({ tone: 'success', text: t('made', { className: isolate(data.name) }) });
        setName('');
        await load();
      } else fail(error);
    } catch {
      fail(undefined);
    } finally {
      setBusy(false);
    }
  }

  if (!user || (!home && !failed)) return <PageSpinner />;
  if (!home) return <Alert tone="error">{t('loadFailed')}</Alert>;
  const active = home.classes.filter((c) => !c.archived);
  const archived = home.classes.filter((c) => c.archived);
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-4xl">{t('title')}</h1>
          <p className="mt-1.5 text-lg text-muted">{t('subtitle')}</p>
        </div>
        <Link href="/teacher/rooms" className={buttonClass('secondary', 'sm')}>
          <Icon name="msg" />
          {t('rooms')}
        </Link>
      </header>
      <NoticeArea notice={notice} />
      {home.schools.length === 0 ? (
        <Alert tone="info">{t('noSchool')}</Alert>
      ) : (
        <Card>
          <h2 className="text-xl">{t('makeTitle')}</h2>
          <form className="mt-3 grid gap-3 sm:grid-cols-3" onSubmit={make}>
            <SelectField
              label={t('school')}
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
            >
              {home.schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </SelectField>
            <TextField
              label={t('className')}
              required
              minLength={2}
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <SelectField
              label={t('track')}
              value={trackId}
              onChange={(e) => setTrackId(e.target.value)}
            >
              <option value="">{t('noTrack')}</option>
              {home.tracks.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.name}
                </option>
              ))}
            </SelectField>
            <div className="sm:col-span-3">
              <Button type="submit" loading={busy}>
                <Icon name="plus" />
                {t('make')}
              </Button>
            </div>
          </form>
        </Card>
      )}
      {active.length === 0 ? (
        <p className="rounded-card border-2 border-dashed border-line px-6 py-10 text-center text-muted">
          {t('none')}
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {active.map((c) => (
            <li key={c.id}>
              <Link
                href={`/teacher/classes/${c.id}`}
                className="flex flex-col gap-2 rounded-card bg-surface p-5 hover:bg-raised"
              >
                <span className="text-xl font-bold">
                  <bdi>{c.name}</bdi>
                </span>
                <span className="text-sm text-muted">
                  <bdi>{c.school.name}</bdi>
                </span>
                <span className="flex flex-wrap gap-2">
                  <Badge tone="brand">{t('students', { count: c.approved })}</Badge>
                  {c.pending ? (
                    <Badge tone="warning">{t('waiting', { count: c.pending })}</Badge>
                  ) : null}
                  <Badge tone="neutral">{t('lessonsSet', { count: c.assignments })}</Badge>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {archived.length ? (
        <section aria-labelledby="archived-heading" className="flex flex-col gap-2">
          <h2 id="archived-heading" className="text-xl">
            {t('archivedTitle')}
          </h2>
          <ul className="flex flex-col gap-1.5">
            {archived.map((c) => (
              <li key={c.id}>
                <Link href={`/teacher/classes/${c.id}`} className="font-semibold underline">
                  <bdi>{c.name}</bdi>
                </Link>{' '}
                <span className="text-muted">
                  · <bdi>{c.school.name}</bdi>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/** One class: its code, students, lessons set, progress on them, and the board. */
export function TeacherClassPage({ classId }: { classId: string }) {
  const t = useTranslations('teacher');
  const format = useFormatter();
  const user = useAccount('TEACHER');
  const [item, setItem] = useState<TeacherClass | null>(null);
  const [catalog, setCatalog] = useState<Catalog[]>([]);
  const [failed, setFailed] = useState(false);
  const [lessonId, setLessonId] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Student | null>(null);
  const [archiving, setArchiving] = useState(false);
  const { notice, setNotice, fail } = useNotice();

  const load = useCallback(async () => {
    try {
      const [detail, lessons] = await Promise.all([
        api.GET('/v1/teacher/classes/{id}', { params: { path: { id: classId } } }),
        api.GET('/v1/teacher/lessons'),
      ]);
      if (detail.data) setItem(detail.data);
      else setFailed(true);
      setCatalog(lessons.data ?? []);
    } catch {
      setFailed(true);
    }
  }, [classId]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  const tracks = useMemo(() => {
    if (!item?.trackId) return catalog;
    const own = catalog.filter((track) => track.id === item.trackId);
    return [...own, ...catalog.filter((track) => track.id !== item.trackId)];
  }, [catalog, item?.trackId]);

  async function run(
    key: string,
    call: () => Promise<{ data?: TeacherClass; error?: unknown }>,
    success: string,
  ) {
    setBusy(key);
    setNotice(null);
    try {
      const { data, error } = await call();
      if (data) {
        setItem(data);
        setNotice({ tone: 'success', text: success });
        return true;
      }
      fail(error);
    } catch {
      fail(undefined);
    } finally {
      setBusy(null);
    }
    return false;
  }

  async function assign(event: FormEvent) {
    event.preventDefault();
    if (!lessonId) return;
    const ok = await run(
      'assign',
      () =>
        api.POST('/v1/teacher/classes/{id}/assignments', {
          params: { path: { id: classId } },
          body: { lessonId, dueAt: dueAt ? new Date(`${dueAt}T23:59:00`).toISOString() : null },
        }),
      t('assigned'),
    );
    if (ok) {
      setLessonId('');
      setDueAt('');
    }
  }

  async function remove() {
    if (!removing) return;
    const student = removing;
    setRemoving(null);
    setBusy('remove');
    try {
      const { error, response } = await api.POST(
        '/v1/teacher/classes/{id}/students/{userId}/remove',
        {
          params: { path: { id: classId, userId: student.userId } },
        },
      );
      if (response.ok) {
        setNotice({ tone: 'success', text: t('removed', { nickname: isolate(student.nickname) }) });
        await load();
      } else fail(error);
    } catch {
      fail(undefined);
    } finally {
      setBusy(null);
    }
  }

  if (!user || (!item && !failed)) return <PageSpinner />;
  if (!item) return <Alert tone="error">{t('loadFailed')}</Alert>;
  const date = (value: string) => format.dateTime(new Date(value), { dateStyle: 'medium' });
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <BackLink href="/teacher">{t('back')}</BackLink>
      <header className="flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-4xl">
            <bdi>{item.name}</bdi>
          </h1>
          <p className="mt-1 text-lg text-muted">
            <bdi>{item.school.name}</bdi>
            {item.archived ? ` · ${t('archived')}` : ''}
          </p>
        </div>
        {item.roomId ? (
          <Link
            href={`/teacher/rooms?room=${item.roomId}`}
            className={buttonClass('secondary', 'sm')}
          >
            <Icon name="msg" />
            {t('room')}
          </Link>
        ) : null}
      </header>
      <NoticeArea notice={notice} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-xl">{t('code')}</h2>
          {item.archived ? (
            <p className="mt-2 text-muted">{t('archivedBody')}</p>
          ) : (
            <>
              <p
                dir="ltr"
                className="mt-3 font-latin text-4xl font-extrabold tracking-[0.15em] text-brand-text"
              >
                {item.joinCode}
              </p>
              <p className="mt-2 text-sm text-muted">{t('codeHelp')}</p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                loading={busy === 'code'}
                onClick={() =>
                  void run(
                    'code',
                    () =>
                      api.POST('/v1/teacher/classes/{id}/code', {
                        params: { path: { id: classId } },
                      }),
                    t('newCodeDone'),
                  )
                }
              >
                <Icon name="refresh" />
                {t('newCode')}
              </Button>
            </>
          )}
        </Card>
        <Card>
          <h2 className="text-xl">{t('licence')}</h2>
          <p className="mt-2">
            {item.seats
              ? t('seats', {
                  used: item.seats.used,
                  total: item.seats.total,
                  date: date(item.seats.endsAt),
                })
              : t('noLicence')}
          </p>
        </Card>
      </div>

      <section aria-labelledby="students-heading" className="flex flex-col gap-3">
        <h2 id="students-heading" className="text-2xl">
          {t('studentsTitle')}
        </h2>
        {item.students.length === 0 ? (
          <p className="text-muted">{t('noStudents')}</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {item.students.map((s) => (
              <li key={s.userId} className="flex items-center gap-3 rounded-row bg-surface p-3">
                <Avatar avatarKey={s.avatarKey} size="sm" />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="font-semibold">
                    <bdi>{s.nickname}</bdi>
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    {s.status === 'PENDING' ? (
                      <Badge tone="warning">{t('pendingBadge')}</Badge>
                    ) : null}
                    {s.schoolPremium ? <Badge tone="brand">{t('premiumBadge')}</Badge> : null}
                  </span>
                </span>
                {item.archived ? null : (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={t('removeLabel', { nickname: isolate(s.nickname) })}
                    onClick={() => setRemoving(s)}
                  >
                    {t('remove')}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card>
          <h2 className="text-xl">{t('assignmentsTitle')}</h2>
          {item.archived ? null : (
            <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={assign}>
              <div className="min-w-64 flex-1">
                <SelectField
                  label={t('lesson')}
                  value={lessonId}
                  required
                  onChange={(e) => setLessonId(e.target.value)}
                >
                  <option value="">{t('chooseLesson')}</option>
                  {tracks.map((track) =>
                    track.modules.map((m) => (
                      <optgroup key={m.id} label={`${track.title} · ${m.title}`}>
                        {m.lessons.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.title}
                          </option>
                        ))}
                      </optgroup>
                    )),
                  )}
                </SelectField>
              </div>
              <TextField
                label={t('dueDate')}
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
              <Button type="submit" loading={busy === 'assign'}>
                {t('assign')}
              </Button>
            </form>
          )}
          {item.assignmentList.length === 0 ? (
            <p className="mt-3 text-muted">{t('noAssignments')}</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {item.assignmentList.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center gap-3 rounded-row bg-raised p-3"
                >
                  <span className="flex min-w-48 flex-1 flex-col">
                    <span className="font-semibold">
                      <bdi>{a.title}</bdi>
                    </span>
                    <span className="text-sm text-muted">
                      <bdi>{a.moduleTitle}</bdi>
                      {a.dueAt ? ` · ${t('due', { date: date(a.dueAt) })}` : ''}
                    </span>
                  </span>
                  <Badge
                    tone={a.done === item.approved && item.approved > 0 ? 'success' : 'neutral'}
                  >
                    {t('doneCount', { done: a.done, total: item.approved })}
                  </Badge>
                  {item.archived ? null : (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={t('unassignLabel', { lesson: isolate(a.title) })}
                      loading={busy === a.id}
                      onClick={() =>
                        void run(
                          a.id,
                          () =>
                            api.DELETE('/v1/teacher/classes/{id}/assignments/{assignmentId}', {
                              params: { path: { id: classId, assignmentId: a.id } },
                            }),
                          t('unassigned'),
                        )
                      }
                    >
                      {t('unassign')}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="text-xl">{t('boardTitle')}</h2>
          <div className="mt-3">
            {item.board.length ? (
              <ClassBoard rows={item.board} caption={t('boardTitle')} />
            ) : (
              <p className="text-muted">{t('noStudents')}</p>
            )}
          </div>
        </Card>
      </div>

      {item.assignmentList.length && item.progress.length ? (
        <Card>
          <h2 className="text-xl">{t('progressTitle')}</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse text-sm">
              <caption className="sr-only">{t('progressCaption')}</caption>
              <thead>
                <tr className="border-b border-line text-start">
                  <th scope="col" className="px-2 py-2 text-start">
                    {t('student')}
                  </th>
                  {item.assignmentList.map((a) => (
                    <th key={a.id} scope="col" className="px-2 py-2 text-start">
                      <bdi>{a.title}</bdi>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {item.progress.map((row) => (
                  <tr key={row.userId}>
                    <th scope="row" className="px-2 py-2 text-start font-semibold">
                      <bdi>{row.nickname}</bdi>
                    </th>
                    {item.assignmentList.map((a) => {
                      const state = row.lessons[a.id] ?? 'NOT_STARTED';
                      return (
                        <td key={a.id} className="px-2 py-2">
                          <Badge tone={STATE_TONE[state]}>{t(`state.${state}`)}</Badge>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {item.archived ? null : (
        <div>
          <Button variant="ghost" onClick={() => setArchiving(true)}>
            {t('archive')}
          </Button>
        </div>
      )}

      <Dialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={t('removeTitle', { nickname: isolate(removing?.nickname ?? '') })}
      >
        <p className="text-muted">{t('removeBody')}</p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setRemoving(null)}>
            {t('cancel')}
          </Button>
          <Button variant="danger" onClick={() => void remove()}>
            {t('remove')}
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={archiving}
        onClose={() => setArchiving(false)}
        title={t('archiveTitle', { className: isolate(item.name) })}
      >
        <p className="text-muted">{t('archiveBody')}</p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setArchiving(false)}>
            {t('cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setArchiving(false);
              void run(
                'archive',
                () =>
                  api.POST('/v1/teacher/classes/{id}/archive', {
                    params: { path: { id: classId } },
                  }),
                t('archivedDone'),
              );
            }}
          >
            {t('archive')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
