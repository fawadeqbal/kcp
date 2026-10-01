'use client';

import type { components } from '@kcp/api-client-ts';
import { clsx } from 'clsx';
import { useFormatter, useTranslations } from 'next-intl';
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { BackLink } from '@/components/back-link';
import {
  Alert,
  Badge,
  Button,
  Card,
  Icon,
  Spinner,
  TextField,
  textareaClass,
} from '@/components/ui';
import { Link, useRouter } from '@/i18n/navigation';
import { api, errorCode } from '@/lib/api';
import { errorMessageKey } from '@/lib/errors';
import { useAccount } from '@/lib/use-account';
import { isolate } from '../auth/validation';
import { CodeEditor } from '../learn/code-editor';
import { ProjectPreview } from '../portfolio/project-preview';
import { languageOf } from '../pro/git-challenge';
import { type ChangedFile, openTeamRepo, pageFiles, type TeamRepo } from './team-git';

type Workspace = components['schemas']['WorkspaceDto'];

const SAVE_DELAY_MS = 400;

/**
 * A repository in the browser: edit the files on your own branch, see the page, commit,
 * send the branch, get the latest main, and open a pull request for review. Used by
 * hackathon teams and hub projects (which add their timer above it).
 */
export function GitWorkspace({
  workspace,
  title,
  backHref,
  backLabel,
  pullsHref,
  pullsLabel,
  openPull,
  readOnlyText,
  readOnlyBadge,
  extra,
  pullExtra,
}: {
  workspace: Workspace;
  title: string;
  backHref: string;
  backLabel: string;
  pullsHref: string;
  pullsLabel?: string;
  /** Opens the pull request; returns where to go next, or the API's error. */
  openPull: (title: string, body: string) => Promise<{ href?: string; error?: unknown }>;
  /** What to say when the server refuses a push (the event isn't running, no timer…). */
  readOnlyText?: string;
  readOnlyBadge?: string;
  extra?: ReactNode;
  /** More fields for the pull request (the hub's task). */
  pullExtra?: ReactNode;
}) {
  const t = useTranslations('workspace');
  const te = useTranslations('errors');
  const router = useRouter();
  const format = useFormatter();
  const [repo, setRepo] = useState<TeamRepo | null>(null);
  const [failed, setFailed] = useState(false);
  const [files, setFiles] = useState<string[]>([]);
  const [contents, setContents] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [changes, setChanges] = useState<ChangedFile[]>([]);
  const [unpushed, setUnpushed] = useState(0);
  const [log, setLog] = useState<Awaited<ReturnType<TeamRepo['log']>>>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<'commit' | 'push' | 'update' | 'pull' | null>(null);
  const [notice, setNotice] = useState<{
    tone: 'success' | 'error' | 'warning';
    text: string;
  } | null>(null);
  const [pullTitle, setPullTitle] = useState('');
  const [pullBody, setPullBody] = useState('');
  const pending = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const refresh = useCallback(async (current: TeamRepo) => {
    const list = await current.files();
    const read: Record<string, string> = {};
    for (const path of list) read[path] = await current.read(path).catch(() => '');
    setFiles(list);
    setContents(read);
    setChanges(await current.changes());
    setUnpushed(await current.unpushed());
    setLog(await current.log().catch(() => []));
    setSelected((now) =>
      now && list.includes(now) ? now : (list.find((p) => p === 'index.html') ?? list[0] ?? null),
    );
  }, []);

  // The repository is opened once per workspace (its files live in the browser).
  const { teamId } = workspace;
  const opened = useRef<string | null>(null);
  useEffect(() => {
    if (opened.current === teamId) return;
    opened.current = teamId;
    let cancelled = false;
    void (async () => {
      try {
        const made = await openTeamRepo(workspace);
        if (cancelled) return;
        setRepo(made);
        await refresh(made);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- once per repository
  }, [teamId, refresh]);

  const preview = useMemo(() => pageFiles(contents), [contents]);

  function edit(path: string, value: string) {
    setContents((now) => ({ ...now, [path]: value }));
    const timers = pending.current;
    clearTimeout(timers.get(path));
    timers.set(
      path,
      setTimeout(() => {
        timers.delete(path);
        if (!repo) return;
        void repo.write(path, value).then(async () => setChanges(await repo.changes()));
      }, SAVE_DELAY_MS),
    );
  }

  /** Writes what's still waiting (typing), before git looks at the files. */
  async function flush() {
    if (!repo) return;
    for (const [path, timer] of pending.current) {
      clearTimeout(timer);
      await repo.write(path, contents[path] ?? '');
    }
    pending.current.clear();
  }

  async function act(kind: NonNullable<typeof busy>, run: () => Promise<void>) {
    if (!repo || busy) return;
    setBusy(kind);
    setNotice(null);
    try {
      await flush();
      await run();
      await refresh(repo);
    } catch (error) {
      const status = (error as { data?: { statusCode?: number } }).data?.statusCode;
      setNotice({
        tone: 'error',
        text: status === 409 || status === 403 ? (readOnlyText ?? t('readOnly')) : te('network'),
      });
    } finally {
      setBusy(null);
    }
  }

  async function commit(event: FormEvent) {
    event.preventDefault();
    const text = message.trim();
    if (!text) return;
    await act('commit', async () => {
      await repo!.commit(text);
      setMessage('');
      setNotice({ tone: 'success', text: t('committed') });
    });
  }

  async function submitPull(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy('pull');
    setNotice(null);
    const { href, error } = await openPull(pullTitle, pullBody).catch((e: unknown) => ({
      href: undefined,
      error: e,
    }));
    setBusy(null);
    if (href) router.push(href);
    else {
      const code = errorCode(error);
      setNotice({
        tone: 'error',
        text:
          code === 'PULL_EXISTS'
            ? t('pullExists')
            : code === 'BRANCH_NOT_FOUND'
              ? t('pushFirst')
              : te(errorMessageKey(code)),
      });
    }
  }

  if (!repo && !failed) {
    return (
      <div className="grid min-h-80 place-items-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner />
          <p className="text-muted">{t('loading')}</p>
        </div>
      </div>
    );
  }
  if (failed) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <BackLink href={backHref}>{backLabel}</BackLink>
        <Alert tone="error">{te('network')}</Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <header className="flex flex-wrap items-center gap-3">
        <BackLink href={backHref}>{backLabel}</BackLink>
        <h1 className="text-3xl">{title}</h1>
        <Badge tone="brand">
          <span dir="ltr">{t('branch', { branch: workspace.branch })}</span>
        </Badge>
        {!workspace.canPush ? (
          <Badge tone="warning">{readOnlyBadge ?? t('readOnlyBadge')}</Badge>
        ) : null}
      </header>
      {extra}
      <div aria-live="polite">
        {notice ? (
          <Alert tone={notice.tone} live={false}>
            {notice.text}
          </Alert>
        ) : null}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <section
          aria-label={t('filesLabel')}
          className="flex min-h-[32rem] flex-col overflow-hidden rounded-panel bg-code-bg"
        >
          <div className="flex flex-wrap gap-1.5 border-b border-line p-2.5">
            {files.map((path) => (
              <button
                key={path}
                type="button"
                aria-pressed={path === selected}
                onClick={() => setSelected(path)}
                className={clsx(
                  'font-latin min-h-9 rounded-full px-3.5 text-sm transition-colors',
                  path === selected
                    ? 'bg-brand-100 font-bold text-brand-800'
                    : 'font-semibold text-muted hover:bg-ink/7 hover:text-ink',
                )}
              >
                <bdi>{path}</bdi>
                {changes.some((c) => c.path === path) ? <span aria-hidden="true"> •</span> : null}
              </button>
            ))}
          </div>
          <div className="relative min-h-0 flex-1 overflow-auto">
            {selected ? (
              <CodeEditor
                key={selected}
                value={contents[selected] ?? ''}
                language={languageOf(selected)}
                label={t('editorLabel', { file: selected })}
                onChange={(value) => edit(selected, value)}
              />
            ) : null}
          </div>
        </section>
        <ProjectPreview files={preview} title={t('previewLabel')} className="h-[28rem]" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl">{t('changesTitle')}</h2>
          {changes.length === 0 ? (
            <p className="mt-2 text-muted">{t('noChanges')}</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1">
              {changes.map((change) => (
                <li key={change.path} className="flex gap-2 text-sm">
                  <Badge tone={change.change === 'deleted' ? 'danger' : 'neutral'}>
                    {t(`change.${change.change}`)}
                  </Badge>
                  <bdi className="font-latin">{change.path}</bdi>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={commit} className="mt-4 flex flex-col gap-3">
            <TextField
              label={t('commitMessage')}
              hint={t('commitHint')}
              value={message}
              maxLength={100}
              onChange={(e) => setMessage(e.target.value)}
            />
            <Button
              type="submit"
              loading={busy === 'commit'}
              disabled={changes.length === 0 || !message.trim()}
              className="self-start"
            >
              <Icon name="check" />
              {t('commit')}
            </Button>
          </form>
          <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-line pt-4">
            <Button
              variant="secondary"
              loading={busy === 'push'}
              disabled={!workspace.canPush || unpushed === 0}
              onClick={() =>
                void act('push', async () => {
                  await repo!.push();
                  setNotice({ tone: 'success', text: t('pushed') });
                })
              }
            >
              <Icon name="send" />
              {t('push', { count: unpushed })}
            </Button>
            <Button
              variant="ghost"
              loading={busy === 'update'}
              onClick={() =>
                void act('update', async () => {
                  const result = await repo!.update();
                  setNotice(
                    result === 'conflict'
                      ? { tone: 'warning', text: t('conflict') }
                      : {
                          tone: 'success',
                          text: result === 'updated' ? t('updated') : t('upToDate'),
                        },
                  );
                })
              }
            >
              <Icon name="refresh" />
              {t('update')}
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl">{t('pullTitle')}</h2>
          <p className="mt-1 text-sm text-muted">{t('pullHelp')}</p>
          <form onSubmit={submitPull} className="mt-4 flex flex-col gap-3">
            <TextField
              label={t('pullName')}
              value={pullTitle}
              maxLength={100}
              onChange={(e) => setPullTitle(e.target.value)}
            />
            <label className="flex flex-col gap-1.5">
              <span className="font-bold">{t('pullBody')}</span>
              <textarea
                className={clsx(textareaClass(), 'min-h-24')}
                value={pullBody}
                maxLength={1000}
                onChange={(e) => setPullBody(e.target.value)}
              />
            </label>
            {pullExtra}
            <Button
              type="submit"
              loading={busy === 'pull'}
              disabled={!workspace.canPush || pullTitle.trim().length < 3}
              className="self-start"
            >
              <Icon name="share" />
              {t('openPull')}
            </Button>
          </form>
          {log.length ? (
            <div className="mt-5 border-t border-line pt-4">
              <h3 className="font-bold">{t('history')}</h3>
              <ol className="mt-2 flex flex-col gap-1 text-sm">
                {log.slice(0, 8).map((entry) => (
                  <li key={entry.oid} className="flex flex-wrap gap-x-2">
                    <code dir="ltr" className="text-muted">
                      {entry.oid.slice(0, 7)}
                    </code>
                    <span className="font-semibold">{entry.message}</span>
                    <span className="text-muted">
                      {isolate(entry.author)} · {format.relativeTime(entry.at, new Date())}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
          <p className="mt-4 text-sm">
            <Link href={pullsHref} className="font-bold text-brand-text hover:underline">
              {pullsLabel ?? t('seePulls')}
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}

/** A hackathon team's repository (the event page links here). */
export function TeamWorkspacePage({ slug }: { slug: string }) {
  const t = useTranslations('workspace');
  const te = useTranslations('errors');
  const user = useAccount('STUDENT');
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [teamName, setTeamName] = useState('');
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const event = await api.GET('/v1/events/{slug}', { params: { path: { slug } } });
        const team = event.data?.team;
        if (!team?.approved) {
          router.replace(`/learn/events/${slug}`);
          return;
        }
        const { data, error } = await api.GET('/v1/teams/{id}/workspace', {
          params: { path: { id: team.id } },
        });
        if (cancelled) return;
        setTeamName(team.name);
        if (data) setWorkspace(data);
        else setFailed(errorMessageKey(errorCode(error)));
      } catch {
        if (!cancelled) setFailed('network');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, slug, router]);

  if (failed) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <BackLink href={`/learn/events/${slug}`}>{t('back')}</BackLink>
        <Alert tone="error">
          {failed === 'GIT_NOT_SET_UP'
            ? t('notSetUp')
            : te(failed === 'network' ? 'network' : 'generic')}
        </Alert>
      </div>
    );
  }
  if (!user || !workspace) {
    return (
      <div className="grid min-h-80 place-items-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner />
          <p className="text-muted">{t('loading')}</p>
        </div>
      </div>
    );
  }
  return (
    <GitWorkspace
      workspace={workspace}
      title={t('title', { team: isolate(teamName) })}
      backHref={`/learn/events/${slug}`}
      backLabel={t('back')}
      pullsHref={`/learn/events/${slug}`}
      openPull={async (title, body) => {
        const { data, error } = await api.POST('/v1/teams/{id}/pulls', {
          params: { path: { id: workspace.teamId } },
          body: { branch: workspace.branch, title, ...(body.trim() ? { body } : {}) },
        });
        return data ? { href: `/learn/events/${slug}/pulls/${data.number}` } : { error };
      }}
    />
  );
}
