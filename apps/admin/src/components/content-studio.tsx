'use client';

import type { components } from '@kcp/api-client-ts';
import {
  Alert,
  Badge,
  type BadgeTone,
  Button,
  buttonClass,
  Card,
  Dialog,
  PageSpinner,
  SelectField,
  TextField,
  textareaClass,
} from '@kcp/ui';
import { clsx } from 'clsx';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, useEffect, useId, useMemo, useState } from 'react';
import { useAction } from '@/lib/action';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { Text } from './content';
import { Cell, Table } from './data';
import { PageHeader } from './shell';

type StudioText = components['schemas']['StudioTextDto'];
type StudioItem = components['schemas']['StudioItemDto'];
type Language = components['schemas']['StudioLanguageDto'];
type EntityType = StudioItem['entityType'];
type Json = Record<string, unknown>;

const ENTITY_LABEL: Record<EntityType, string> = {
  LESSON: 'Lesson',
  CHALLENGE: 'Try it step',
  PROJECT: 'Module project',
  QUIZ: 'Quiz',
};
const pathOf = (type: EntityType) =>
  type.toLowerCase() as 'lesson' | 'challenge' | 'project' | 'quiz';

const STATUS: Record<StudioItem['status'], { label: string; tone: BadgeTone }> = {
  MISSING: { label: 'Not translated', tone: 'warning' },
  LIVE: { label: 'Live', tone: 'success' },
  DRAFT: { label: 'Draft', tone: 'neutral' },
  IN_REVIEW: { label: 'Waiting for review', tone: 'brand' },
};

const linkClass = 'font-semibold text-brand-text underline-offset-4 hover:underline';

/** The languages anyone can translate into (switched on or not yet). */
function useLanguages() {
  return useLoad(() => api.GET('/v1/admin/content/studio/languages'), 'studio-languages');
}

/** The language in the page's address (?lang=), English by default. */
function useLanguageParam(fallback = 'en') {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const language = params.get('lang') ?? fallback;
  const setLanguage = (code: string) => router.replace(`${pathname}?lang=${code}`);
  return [language, setLanguage] as const;
}

function LanguagePicker({
  languages,
  value,
  onChange,
}: {
  languages: Language[];
  value: string;
  onChange: (code: string) => void;
}) {
  return (
    <div className="max-w-xs">
      <SelectField label="Translate into" value={value} onChange={(e) => onChange(e.target.value)}>
        {languages.map((l) => (
          <option key={l.code} value={l.code}>
            {l.name} ({l.nativeName}){l.isActive ? '' : ' — not switched on yet'}
          </option>
        ))}
      </SelectField>
    </div>
  );
}

/** Admin → Content → Translate: every text of a module in one language. */
export function StudioModule({ id }: { id: string }) {
  const [language, setLanguage] = useLanguageParam('ur');
  const languages = useLanguages();
  const module = useLoad(
    () =>
      api.GET('/v1/admin/content/studio/modules/{id}/{lang}', {
        params: { path: { id, lang: language } },
      }),
    `${id}|${language}`,
  );
  if (module.error || languages.error) {
    return <Alert tone="error">{module.error ?? languages.error}</Alert>;
  }
  if (!module.data || !languages.data) return <PageSpinner label="Loading" />;
  const data = module.data;
  const counts = data.counts;
  // Grouped as the lesson page shows them: each lesson with its steps and quizzes.
  const groups: { lessonId: string | null; items: StudioItem[] }[] = [];
  for (const item of data.items) {
    const last = groups.at(-1);
    if (last && last.lessonId === item.lessonId) last.items.push(item);
    else groups.push({ lessonId: item.lessonId, items: [item] });
  }
  return (
    <>
      <PageHeader
        title={`Translate: ${data.title}`}
        description="Write a draft, send it for review, and a second person publishes it. Students keep reading the live text until then."
        actions={
          <Link href={`/content/${id}`} className={buttonClass('secondary', 'sm')}>
            Preview the module
          </Link>
        }
      />
      <div className="flex flex-col gap-6">
        <Card>
          <div className="flex flex-wrap items-end gap-6">
            <LanguagePicker
              languages={languages.data.languages}
              value={language}
              onChange={setLanguage}
            />
            <p className="flex flex-wrap gap-2 text-sm">
              <Badge tone="success">{counts.live} live</Badge>
              <Badge tone="warning">{counts.missing} not translated</Badge>
              <Badge tone="neutral">{counts.draft} drafts</Badge>
              <Badge tone="brand">{counts.inReview} waiting for review</Badge>
              {counts.englishChanged ? (
                <Badge tone="danger">{counts.englishChanged} where English changed</Badge>
              ) : null}
            </p>
          </div>
        </Card>
        {groups.map((group, index) => (
          <Card
            key={group.lessonId ?? 'project'}
            title={group.lessonId ? `Lesson ${index + 1}` : 'Module project'}
          >
            <Table
              bare
              caption={group.lessonId ? `Texts of lesson ${index + 1}` : 'Texts of the project'}
              columns={['Text', 'Status', 'Last change', '']}
              empty={false}
            >
              {group.items.map((item) => (
                <tr key={`${item.entityType}:${item.entityId}`}>
                  <Cell>
                    <span className="block text-sm text-muted">
                      {ENTITY_LABEL[item.entityType]}
                    </span>
                    <span className="font-semibold">{item.title}</span>
                  </Cell>
                  <Cell>
                    <span className="flex flex-wrap gap-1.5">
                      <Badge tone={STATUS[item.status].tone}>{STATUS[item.status].label}</Badge>
                      {item.englishChanged ? <Badge tone="danger">English changed</Badge> : null}
                      {item.fromStudio && item.status === 'LIVE' ? (
                        <Badge tone="neutral">Not in content/ yet</Badge>
                      ) : null}
                      {item.reviewNote ? <Badge tone="warning">Changes asked</Badge> : null}
                    </span>
                  </Cell>
                  <Cell>
                    {item.draftUpdatedAt
                      ? `${formatDateTime(item.draftUpdatedAt)}${item.editedBy ? ` · ${item.editedBy.name}` : ''}`
                      : '—'}
                  </Cell>
                  <Cell>
                    <Link
                      href={`/content/text/${pathOf(item.entityType)}/${item.entityId}?lang=${language}`}
                      className={linkClass}
                    >
                      {item.status === 'MISSING' ? 'Translate' : 'Open'}
                    </Link>
                  </Cell>
                </tr>
              ))}
            </Table>
          </Card>
        ))}
      </div>
    </>
  );
}

/** Admin → Content → Waiting for review: drafts someone else can publish. */
export function StudioReviews() {
  const reviews = useLoad(() => api.GET('/v1/admin/content/studio/reviews'), 'studio-reviews');
  if (reviews.error) return <Alert tone="error">{reviews.error}</Alert>;
  if (!reviews.data) return <PageSpinner label="Loading" />;
  return (
    <>
      <PageHeader
        title="Waiting for review"
        description="Translations sent for review, oldest first. You can publish drafts written by someone else."
      />
      <Table
        caption="Drafts waiting for review"
        columns={['Text', 'Language', 'Written by', 'Sent', '']}
        empty={reviews.data.items.length === 0}
        emptyText="Nothing is waiting for review."
      >
        {reviews.data.items.map((item) => (
          <tr key={`${item.entityType}:${item.entityId}:${item.language}`}>
            <Cell>
              <span className="block text-sm text-muted">{ENTITY_LABEL[item.entityType]}</span>
              <span className="font-semibold">{item.title}</span>
            </Cell>
            <Cell>{item.language}</Cell>
            <Cell>{item.editedBy?.name ?? '—'}</Cell>
            <Cell>{item.submittedAt ? formatDateTime(item.submittedAt) : '—'}</Cell>
            <Cell>
              <Link
                href={`/content/text/${pathOf(item.entityType)}/${item.entityId}?lang=${item.language}`}
                className={linkClass}
              >
                Review
              </Link>
            </Cell>
          </tr>
        ))}
      </Table>
    </>
  );
}

// ── One text: English beside the translation ─────────────────────────────────

const str = (value: unknown) => (typeof value === 'string' ? value : '');
const map = (value: unknown) =>
  value && typeof value === 'object' ? (value as Record<string, string>) : {};

/** The editable fields of a text, from a draft, the live text or nothing. */
function initialForm(text: StudioText): Json {
  const source = (text.draft?.data ?? text.live ?? {}) as Json;
  return structuredClone(source);
}

/** Admin → Content → one text in one language: side by side with English. */
export function StudioTextEditor({ entity, id }: { entity: string; id: string }) {
  const { state } = useAuth();
  const canWrite = state.status === 'authenticated' && state.ability.can('create', 'ContentText');
  const [language] = useLanguageParam('ur');
  const languages = useLanguages();
  const path = entity as 'lesson' | 'challenge' | 'project' | 'quiz';
  const text = useLoad(
    () =>
      api.GET('/v1/admin/content/studio/texts/{entity}/{id}/{lang}', {
        params: { path: { entity: path, id, lang: language } },
      }),
    `${entity}|${id}|${language}`,
  );
  const [form, setForm] = useState<Json | null>(null);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'return' | 'discard' | { versionId: string } | null>(null);
  const action = useAction();

  useEffect(() => {
    if (text.data) {
      setForm(initialForm(text.data));
      setDirty(false);
    }
  }, [text.data]);

  const lang = languages.data?.languages.find((l) => l.code === language);
  const rtl = lang?.direction === 'RTL';
  if (text.error || languages.error)
    return <Alert tone="error">{text.error ?? languages.error}</Alert>;
  if (!text.data || !form || !languages.data) return <PageSpinner label="Loading" />;
  const data = text.data;
  const draft = data.draft;

  const set = (key: string, value: unknown) => {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setNotice(null);
  };
  const setIn = (key: string, name: string, value: string) =>
    set(key, { ...map(form[key]), [name]: value });

  const textPath = { params: { path: { entity: path, id, lang: language } } };
  const save = async () => {
    const ok = await action.run(() =>
      api.PUT('/v1/admin/content/studio/texts/{entity}/{id}/{lang}', {
        ...textPath,
        body: { data: form },
      }),
    );
    if (ok) {
      setDirty(false);
      setNotice('Draft saved. Students still read the live text.');
      text.reload();
    }
    return ok;
  };
  const submit = async () => {
    if ((dirty || !draft) && !(await save())) return;
    if (
      await action.run(() =>
        api.POST('/v1/admin/content/studio/texts/{entity}/{id}/{lang}/submit', textPath),
      )
    ) {
      setNotice('Sent for review. Someone else can now publish it.');
      text.reload();
    }
  };
  const publish = async () => {
    if (
      await action.run(() =>
        api.POST('/v1/admin/content/studio/texts/{entity}/{id}/{lang}/publish', textPath),
      )
    ) {
      setNotice('Published: students read this text now.');
      text.reload();
    }
  };

  const english = (data.english ?? {}) as Json;
  const status = draft ? draft.status : data.live ? 'LIVE' : 'MISSING';
  return (
    <>
      <PageHeader
        title={data.title}
        description={`${ENTITY_LABEL[data.entityType]} · ${lang?.name ?? language}${lang && !lang.isActive ? ' (not switched on for students yet)' : ''}`}
        actions={
          <Link
            href={`/content/${data.moduleId}/translate?lang=${language}`}
            className={buttonClass('secondary', 'sm')}
          >
            Back to the module
          </Link>
        }
      />
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={STATUS[status].tone}>{STATUS[status].label}</Badge>
          {data.englishChanged ? (
            <Badge tone="danger">The English changed since this went live</Badge>
          ) : null}
          {draft ? (
            <span className="text-sm text-muted">
              Draft by {draft.editedBy?.name ?? 'someone'} · {formatDateTime(draft.updatedAt)}
            </span>
          ) : null}
        </div>
        {draft?.reviewNote ? (
          <Alert tone="warning">
            <p className="font-semibold">The reviewer asked for changes</p>
            <p>{draft.reviewNote}</p>
          </Alert>
        ) : null}
        {notice ? <Alert tone="success">{notice}</Alert> : null}
        {action.error ? <Alert tone="error">{action.error}</Alert> : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="English (live)">
            <EnglishView text={data} english={english} />
          </Card>
          <Card title={`${lang?.name ?? language}${dirty ? ' · not saved' : ''}`}>
            <fieldset
              disabled={!canWrite}
              lang={language}
              dir={rtl ? 'rtl' : 'ltr'}
              className="flex flex-col gap-4"
            >
              <Fields
                text={data}
                english={english}
                form={form}
                language={language}
                rtl={rtl}
                set={set}
                setIn={setIn}
              />
            </fieldset>
          </Card>
        </div>

        {canWrite ? (
          <Card title="Draft and review">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => void save()}
                disabled={!dirty || action.busy}
                variant="secondary"
              >
                Save draft
              </Button>
              {draft?.status !== 'IN_REVIEW' ? (
                <Button onClick={() => void submit()} disabled={action.busy}>
                  Send for review
                </Button>
              ) : null}
              {data.canPublish ? (
                <>
                  <Button
                    onClick={() => void publish()}
                    disabled={action.busy || dirty}
                    variant="sage"
                  >
                    Publish
                  </Button>
                  <Button onClick={() => setDialog('return')} variant="secondary">
                    Ask for changes
                  </Button>
                </>
              ) : draft?.status === 'IN_REVIEW' ? (
                <span className="text-sm text-muted">
                  Waiting for someone else to review and publish it.
                </span>
              ) : null}
              {draft ? (
                <Button onClick={() => setDialog('discard')} variant="ghost" className="ms-auto">
                  Discard draft
                </Button>
              ) : null}
            </div>
            {dirty && data.canPublish ? (
              <p className="mt-2 text-sm text-muted">
                You changed the draft: save it and send it for review again, so someone else checks
                your change.
              </p>
            ) : null}
          </Card>
        ) : null}

        <Card title="History">
          <Table
            bare
            caption="Every text that went live"
            columns={['When', 'How', 'Written by', 'Published by', '']}
            empty={data.versions.length === 0}
            emptyText="Nothing has gone live in this language yet."
          >
            {data.versions.map((version, index) => (
              <tr key={version.id}>
                <Cell>
                  {formatDateTime(version.createdAt)}
                  {index === 0 && data.live ? (
                    <span className="text-muted"> (live now)</span>
                  ) : null}
                </Cell>
                <Cell>{version.action === 'IMPORT' ? 'From content/' : 'Published here'}</Cell>
                <Cell>{version.editedBy?.name ?? '—'}</Cell>
                <Cell>{version.publishedBy?.name ?? '—'}</Cell>
                <Cell>
                  <button
                    type="button"
                    className={linkClass}
                    onClick={() => setDialog({ versionId: version.id })}
                  >
                    View
                  </button>
                </Cell>
              </tr>
            ))}
          </Table>
        </Card>
      </div>

      {dialog === 'return' ? (
        <ReturnDialog
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            setNotice('Sent back to the translator with your note.');
            text.reload();
          }}
          textPath={textPath}
        />
      ) : null}
      {dialog === 'discard' ? (
        <Dialog open onClose={() => setDialog(null)} title="Discard the draft?">
          <p>The live text stays as it is. The draft can’t be brought back.</p>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={() => setDialog(null)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (
                  await action.run(() =>
                    api.DELETE(
                      '/v1/admin/content/studio/texts/{entity}/{id}/{lang}/draft',
                      textPath,
                    ),
                  )
                ) {
                  setDialog(null);
                  setNotice('Draft discarded.');
                  text.reload();
                }
              }}
            >
              Discard
            </Button>
          </div>
        </Dialog>
      ) : null}
      {dialog && typeof dialog === 'object' ? (
        <VersionDialog
          versionId={dialog.versionId}
          textPath={textPath}
          text={data}
          language={language}
          rtl={rtl}
          canRestore={canWrite}
          onClose={() => setDialog(null)}
          onRestored={() => {
            setDialog(null);
            setNotice('That version is the draft now: send it for review to make it live again.');
            text.reload();
          }}
        />
      ) : null}
    </>
  );
}

function EnglishView({ text, english }: { text: StudioText; english: Json }) {
  return (
    <div className="flex flex-col gap-4 text-sm" dir="ltr" lang="en">
      {text.entityType === 'QUIZ' ? (
        <>
          <Labelled label="Question">{str(english['prompt'])}</Labelled>
          <Labelled label="Explanation">{str(english['explanation']) || '—'}</Labelled>
          {text.options.map((option) => (
            <Labelled key={option} label={`Option ${option}`}>
              {map(english['options'])[option] ?? '—'}
            </Labelled>
          ))}
        </>
      ) : (
        <>
          <Labelled label="Title">{str(english['title'])}</Labelled>
          {'summary' in english ? (
            <Labelled label="Summary">{str(english['summary'])}</Labelled>
          ) : null}
          <div>
            <p className="font-semibold">
              {text.entityType === 'CHALLENGE' ? 'Instructions' : 'Text'}
            </p>
            <div className="mt-1 rounded-row bg-raised p-4">
              <Text language="en">{str(english['body'] ?? english['instructions'])}</Text>
            </div>
          </div>
          {text.hintKeys.map((key) => (
            <Labelled key={key} label={`Hint “${key}”`}>
              {map(english['hints'])[key] ?? '—'}
            </Labelled>
          ))}
          {text.checks.map((check) => (
            <Labelled key={check.id} label={`Check “${check.id}” (${check.description})`}>
              {map(english['checkLabels'])[check.id] ?? '—'}
            </Labelled>
          ))}
          {text.entityType === 'LESSON' && str(english['videoId']) ? (
            <Labelled label="Video">
              {str(english['videoProvider'])}: {str(english['videoId'])}
            </Labelled>
          ) : null}
        </>
      )}
    </div>
  );
}

function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="font-semibold">{label}</p>
      <p className="mt-1 whitespace-pre-wrap">{children}</p>
    </div>
  );
}

function Fields({
  text,
  english,
  form,
  language,
  rtl,
  set,
  setIn,
}: {
  text: StudioText;
  english: Json;
  form: Json;
  language: string;
  rtl: boolean;
  set: (key: string, value: unknown) => void;
  setIn: (key: string, name: string, value: string) => void;
}) {
  if (text.entityType === 'QUIZ') {
    return (
      <>
        <Area
          label="Question"
          value={str(form['prompt'])}
          rows={3}
          onChange={(v) => set('prompt', v)}
        />
        <Area
          label="Explanation (shown after answering)"
          value={str(form['explanation'])}
          rows={3}
          onChange={(v) => set('explanation', v)}
        />
        {text.options.map((option) => (
          <TextField
            key={option}
            label={`Option ${option}`}
            hint={map(english['options'])[option]}
            value={map(form['options'])[option] ?? ''}
            onChange={(e) => setIn('options', option, e.target.value)}
          />
        ))}
      </>
    );
  }
  const bodyKey = text.entityType === 'CHALLENGE' ? 'instructions' : 'body';
  return (
    <>
      <TextField
        label="Title"
        value={str(form['title'])}
        maxLength={150}
        onChange={(e) => set('title', e.target.value)}
      />
      {text.entityType !== 'CHALLENGE' ? (
        <Area
          label="Summary"
          value={str(form['summary'])}
          rows={2}
          onChange={(v) => set('summary', v)}
        />
      ) : null}
      <MarkdownArea
        label={text.entityType === 'CHALLENGE' ? 'Instructions (Markdown)' : 'Text (Markdown)'}
        value={str(form[bodyKey])}
        language={language}
        rtl={rtl}
        onChange={(v) => set(bodyKey, v)}
      />
      {text.hintKeys.map((key) => (
        <TextField
          key={key}
          label={`Hint “${key}”`}
          hint={map(english['hints'])[key]}
          value={map(form['hints'])[key] ?? ''}
          onChange={(e) => setIn('hints', key, e.target.value)}
        />
      ))}
      {text.checks.map((check) => (
        <TextField
          key={check.id}
          label={`Check “${check.id}”`}
          hint={map(english['checkLabels'])[check.id] ?? check.description}
          value={map(form['checkLabels'])[check.id] ?? ''}
          onChange={(e) => setIn('checkLabels', check.id, e.target.value)}
        />
      ))}
      {text.entityType === 'LESSON' ? (
        <div className="grid gap-4 sm:grid-cols-2" dir="ltr">
          <SelectField
            label="Video in this language"
            value={str(form['videoProvider'])}
            onChange={(e) => set('videoProvider', e.target.value || null)}
          >
            <option value="">No video</option>
            <option value="youtube">YouTube (privacy mode)</option>
            <option value="cloudflare">Cloudflare Stream</option>
          </SelectField>
          <TextField
            label="Video ID"
            value={str(form['videoId'])}
            onChange={(e) => set('videoId', e.target.value || null)}
            disabled={!str(form['videoProvider'])}
          />
        </div>
      ) : null}
    </>
  );
}

function Area({
  label,
  value,
  rows,
  onChange,
}: {
  label: string;
  value: string;
  rows: number;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={textareaClass()}
      />
    </div>
  );
}

/** Markdown with a preview as students will see it. */
function MarkdownArea({
  label,
  value,
  language,
  rtl,
  onChange,
}: {
  label: string;
  value: string;
  language: string;
  rtl: boolean;
  onChange: (value: string) => void;
}) {
  const [preview, setPreview] = useState(false);
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3">
        <label htmlFor={id} className="text-sm font-semibold">
          {label}
        </label>
        <button
          type="button"
          className={clsx(linkClass, 'ms-auto text-sm')}
          onClick={() => setPreview((p) => !p)}
        >
          {preview ? 'Edit' : 'Preview as students see it'}
        </button>
      </div>
      {preview ? (
        <div className="min-h-40 rounded-row bg-raised p-4">
          <Text language={language} rtl={rtl}>
            {value}
          </Text>
        </div>
      ) : (
        <textarea
          id={id}
          rows={14}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={clsx(textareaClass(), 'font-mono text-sm')}
        />
      )}
    </div>
  );
}

type TextPath = {
  params: {
    path: { entity: 'lesson' | 'challenge' | 'project' | 'quiz'; id: string; lang: string };
  };
};

function ReturnDialog({
  onClose,
  onDone,
  textPath,
}: {
  onClose: () => void;
  onDone: () => void;
  textPath: TextPath;
}) {
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | undefined>();
  const action = useAction();
  return (
    <Dialog open onClose={onClose} title="Ask for changes">
      <form
        className="flex flex-col gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (note.trim().length < 3) {
            setError('Say what to change (at least 3 characters).');
            return;
          }
          if (
            await action.run(() =>
              api.POST('/v1/admin/content/studio/texts/{entity}/{id}/{lang}/return', {
                ...textPath,
                body: { note: note.trim() },
              }),
            )
          ) {
            onDone();
          }
        }}
      >
        {action.error ? <Alert tone="error">{action.error}</Alert> : null}
        <TextField
          label="What should change?"
          hint="The translator sees this note."
          maxLength={500}
          value={note}
          error={error}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={action.busy}>
            Send back
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function VersionDialog({
  versionId,
  textPath,
  text,
  language,
  rtl,
  canRestore,
  onClose,
  onRestored,
}: {
  versionId: string;
  textPath: TextPath;
  text: StudioText;
  language: string;
  rtl: boolean;
  canRestore: boolean;
  onClose: () => void;
  onRestored: () => void;
}) {
  const path = useMemo(
    () => ({ params: { path: { ...textPath.params.path, versionId } } }),
    [textPath, versionId],
  );
  const version = useLoad(
    () => api.GET('/v1/admin/content/studio/texts/{entity}/{id}/{lang}/versions/{versionId}', path),
    versionId,
  );
  const action = useAction();
  return (
    <Dialog open onClose={onClose} title="An earlier text">
      {version.error ? <Alert tone="error">{version.error}</Alert> : null}
      {action.error ? <Alert tone="error">{action.error}</Alert> : null}
      {!version.data ? (
        <PageSpinner label="Loading" />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            {version.data.action === 'IMPORT' ? 'From content/' : 'Published here'} ·{' '}
            {formatDateTime(version.data.createdAt)}
          </p>
          <div
            lang={language}
            dir={rtl ? 'rtl' : 'ltr'}
            className="max-h-[50dvh] overflow-auto rounded-row bg-raised p-4 text-sm"
          >
            <p className="font-semibold">
              {str(version.data.data['title'] ?? version.data.data['prompt'])}
            </p>
            <div className="mt-2">
              <Text language={language} rtl={rtl}>
                {str(
                  version.data.data['body'] ??
                    version.data.data['instructions'] ??
                    version.data.data['explanation'],
                )}
              </Text>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            {canRestore ? (
              <Button
                loading={action.busy}
                onClick={async () => {
                  if (
                    await action.run(() =>
                      api.POST(
                        '/v1/admin/content/studio/texts/{entity}/{id}/{lang}/versions/{versionId}/restore',
                        path,
                      ),
                    )
                  ) {
                    onRestored();
                  }
                }}
              >
                Use it as the draft
              </Button>
            ) : null}
          </div>
          {text.draft ? (
            <p className="text-sm text-muted">This replaces the current draft.</p>
          ) : null}
        </div>
      )}
    </Dialog>
  );
}
