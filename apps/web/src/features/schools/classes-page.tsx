'use client';

import type { components } from '@kcp/api-client-ts';
import { clsx } from 'clsx';
import { useFormatter, useTranslations } from 'next-intl';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
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
  TextField,
} from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { api, errorCode } from '@/lib/api';
import { errorMessageKey } from '@/lib/errors';
import { useAccount } from '@/lib/use-account';
import { isolate } from '../auth/validation';
import { SocialTabs } from '../rooms/social-tabs';

type StudentClass = components['schemas']['StudentClassDto'];
type BoardRow = components['schemas']['BoardRowDto'];

/** A class's weekly board: rank, avatar, nickname and XP (nicknames only). */
export function ClassBoard({ rows, caption }: { rows: BoardRow[]; caption: string }) {
  const t = useTranslations('classes');
  if (rows.length === 0) return null;
  return (
    <ol aria-label={caption} className="flex flex-col gap-1.5">
      {rows.map((row, index) => (
        <li
          key={`${row.nickname}-${index}`}
          className="flex items-center gap-3 rounded-row bg-raised px-3 py-2"
        >
          <span className="w-6 text-center font-bold text-muted">{row.rank}</span>
          <Avatar avatarKey={row.avatarKey} size="sm" />
          <span className="flex-1 font-semibold">
            <bdi>{row.nickname}</bdi>
          </span>
          <span className="font-bold">{t('xp', { xp: row.xp })}</span>
        </li>
      ))}
    </ol>
  );
}

/** A student's classes: join with a code (a parent approves), the lessons set, the board. */
export function ClassesPage() {
  const t = useTranslations('classes');
  const te = useTranslations('errors');
  const format = useFormatter();
  const user = useAccount('STUDENT');
  const [classes, setClasses] = useState<StudentClass[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState<StudentClass | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.GET('/v1/classes');
      if (data) setClasses(data);
      else setFailed(true);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  async function join(event: FormEvent) {
    event.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const { data, error } = await api.POST('/v1/classes/join', {
        body: { code: code.trim() },
      });
      if (data) {
        setMessage({ tone: 'success', text: t('joinSent', { className: isolate(data.name) }) });
        setCode('');
        await load();
      } else {
        setMessage({ tone: 'error', text: te(errorMessageKey(errorCode(error))) });
      }
    } catch {
      setMessage({ tone: 'error', text: te('network') });
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    if (!leaving) return;
    const name = leaving.name;
    await api
      .POST('/v1/classes/{id}/leave', { params: { path: { id: leaving.id } } })
      .catch(() => undefined);
    setLeaving(null);
    setMessage({ tone: 'success', text: t('left', { className: isolate(name) }) });
    await load();
  }

  if (!user || (!classes && !failed)) return <PageSpinner />;
  const now = Date.now();
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-4">
        <SocialTabs current="classes" />
        <div>
          <h1 className="text-4xl">{t('title')}</h1>
          <p className="mt-1.5 text-lg text-muted">{t('subtitle')}</p>
        </div>
      </header>

      <Card>
        <h2 className="text-xl">{t('joinTitle')}</h2>
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={join} noValidate>
          <div className="min-w-56 flex-1">
            <TextField
              label={t('codeLabel')}
              name="class-code"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              dir="ltr"
              maxLength={6}
              className="font-latin text-xl tracking-widest"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <Button type="submit" loading={busy}>
            <Icon name="userPlus" />
            {t('join')}
          </Button>
        </form>
      </Card>
      <div aria-live="polite">
        {message ? (
          <Alert tone={message.tone} live={false}>
            {message.text}
          </Alert>
        ) : null}
      </div>

      {!classes ? (
        <Alert tone="error">{t('loadFailed')}</Alert>
      ) : classes.length === 0 ? (
        <p className="rounded-card border-2 border-dashed border-line px-6 py-10 text-center text-muted">
          {t('none')}
        </p>
      ) : (
        classes.map((item) => (
          <Card key={item.id}>
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-48 flex-1">
                <h2 className="text-2xl">
                  <bdi>{item.name}</bdi>
                </h2>
                <p className="text-muted">
                  {t('byTeacher', { school: isolate(item.school), teacher: isolate(item.teacher) })}
                </p>
              </div>
              {item.status === 'PENDING' ? (
                <Badge tone="warning">{t('waitingParent')}</Badge>
              ) : item.roomId ? (
                <Link
                  href={`/learn/rooms?room=${item.roomId}`}
                  className={buttonClass('secondary', 'sm')}
                >
                  <Icon name="msg" />
                  {t('room')}
                </Link>
              ) : null}
            </div>
            {item.status === 'APPROVED' ? (
              <div className="mt-4 grid gap-5 md:grid-cols-2">
                <section aria-labelledby={`assignments-${item.id}`}>
                  <h3 id={`assignments-${item.id}`} className="text-lg">
                    {t('assignments')}
                  </h3>
                  {item.assignments.length === 0 ? (
                    <p className="mt-1 text-muted">{t('noAssignments')}</p>
                  ) : (
                    <ul className="mt-2 flex flex-col gap-2">
                      {item.assignments.map((a) => {
                        const late =
                          !a.done && a.dueAt !== null && new Date(a.dueAt).getTime() < now;
                        return (
                          <li key={a.lessonId}>
                            <Link
                              href={`/learn/${a.lessonId}`}
                              className="flex items-center gap-3 rounded-row bg-raised p-3 hover:bg-sand-200"
                            >
                              <span
                                className={clsx(
                                  'grid size-9 shrink-0 place-items-center rounded-full',
                                  a.done ? 'bg-sage-600 text-sage-100' : 'bg-sand-200 text-muted',
                                )}
                              >
                                <Icon name={a.done ? 'check' : 'book'} />
                              </span>
                              <span className="flex min-w-0 flex-1 flex-col">
                                <span className="font-semibold">
                                  <bdi>{a.title}</bdi>
                                </span>
                                <span
                                  className={clsx(
                                    'text-sm',
                                    late ? 'text-danger-text' : 'text-muted',
                                  )}
                                >
                                  <bdi>{a.moduleTitle}</bdi>
                                  {a.dueAt
                                    ? ` · ${t(late ? 'overdue' : 'due', {
                                        date: format.dateTime(new Date(a.dueAt), {
                                          dateStyle: 'medium',
                                        }),
                                      })}`
                                    : ''}
                                </span>
                              </span>
                              <span className="sr-only">{a.done ? t('done') : t('todo')}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
                <section aria-labelledby={`board-${item.id}`}>
                  <h3 id={`board-${item.id}`} className="text-lg">
                    {t('board')}
                  </h3>
                  <div className="mt-2">
                    <ClassBoard rows={item.board} caption={t('board')} />
                  </div>
                </section>
              </div>
            ) : null}
            <div className="mt-4">
              <Button variant="ghost" size="sm" onClick={() => setLeaving(item)}>
                {t('leave')}
              </Button>
            </div>
          </Card>
        ))
      )}

      <Dialog
        open={leaving !== null}
        onClose={() => setLeaving(null)}
        title={t('leaveTitle', { className: isolate(leaving?.name ?? '') })}
      >
        <p className="text-muted">{t('leaveBody')}</p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setLeaving(null)}>
            {t('cancel')}
          </Button>
          <Button variant="danger" onClick={() => void leave()}>
            {t('leave')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
