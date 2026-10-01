'use client';

import type { components } from '@kcp/api-client-ts';
import {
  Alert,
  Badge,
  Button,
  buttonClass,
  Card,
  Dialog,
  PageSpinner,
  SelectField,
  TextField,
} from '@kcp/ui';
import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useAction } from '@/lib/action';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { Cell, Table } from './data';
import { PageHeader } from './shell';

type Preview = components['schemas']['ModulePreviewDto'];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'Arabic' },
  { code: 'ur', name: 'Urdu' },
] as const;
const RTL = new Set(['ar', 'ur']);
const titleOf = (titles: Record<string, string>) => titles['en'] ?? Object.values(titles)[0] ?? '';

/**
 * Admin → Content: every module, whether students see it, and a link to preview it.
 * Lessons are written as files in content/ and imported on deploy; in staging and
 * production new modules wait here until someone publishes them.
 */
export function ContentList() {
  const { state } = useAuth();
  const canTranslate = state.status === 'authenticated' && state.ability.can('read', 'ContentText');
  const tree = useLoad(() => api.GET('/v1/admin/content'), 'content');
  if (tree.error) return <Alert tone="error">{tree.error}</Alert>;
  if (!tree.data) return <PageSpinner label="Loading" />;
  return (
    <>
      <PageHeader
        title="Content"
        description="Modules from content/ (imported on every deploy). Students see a module once it is published: preview it in each language first. Translate texts here; a second person reviews and publishes them."
        actions={
          canTranslate ? (
            <Link href="/content/reviews" className={buttonClass('secondary', 'sm')}>
              Waiting for review
            </Link>
          ) : null
        }
      />
      <div className="flex flex-col gap-6">
        {tree.data.tracks.map((track) => (
          <Card
            key={track.id}
            title={`${titleOf(track.titles)} track${track.isActive ? '' : ' (removed)'}`}
          >
            <Table
              bare
              caption={`${titleOf(track.titles)} modules`}
              columns={['Module', 'Students see it', 'Lessons', 'Challenges', 'Languages', '']}
              empty={track.modules.length === 0}
              emptyText="No modules yet."
            >
              {track.modules.map((module) => (
                <tr key={module.id}>
                  <Cell>
                    <span className="font-semibold">{titleOf(module.titles)}</span>
                    <span className="block text-sm text-muted font-latin">{module.id}</span>
                  </Cell>
                  <Cell>
                    {!module.isActive ? (
                      <Badge tone="neutral">Removed from content/</Badge>
                    ) : module.publishedAt ? (
                      <Badge tone="success">Published</Badge>
                    ) : (
                      <Badge tone="warning">Waiting to be published</Badge>
                    )}
                  </Cell>
                  <Cell>
                    {module.lessons}
                    {module.premiumLessons ? (
                      <span className="text-muted"> ({module.premiumLessons} premium)</span>
                    ) : null}
                    {module.hasProject ? <span className="text-muted"> + project</span> : null}
                  </Cell>
                  <Cell>{module.challenges}</Cell>
                  <Cell>{module.languages.join(', ') || '—'}</Cell>
                  <Cell>
                    <span className="flex flex-wrap gap-x-4 gap-y-1">
                      <Link
                        href={`/content/${module.id}`}
                        className="font-semibold text-brand-text underline-offset-4 hover:underline"
                      >
                        Preview
                      </Link>
                      {canTranslate ? (
                        <Link
                          href={`/content/${module.id}/translate`}
                          className="font-semibold text-brand-text underline-offset-4 hover:underline"
                        >
                          Translate
                        </Link>
                      ) : null}
                    </span>
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

/** One module as students would read it, in one language, and publishing. */
export function ContentPreview({ id }: { id: string }) {
  const { state } = useAuth();
  const canPublish = state.status === 'authenticated' && state.ability.can('update', 'Content');
  const [language, setLanguage] = useState<string>('en');
  const preview = useLoad(
    () =>
      api.GET('/v1/admin/content/modules/{id}', {
        params: { path: { id }, query: { lang: language } },
      }),
    `${id}|${language}`,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<'publish' | 'unpublish' | null>(null);

  if (preview.error) return <Alert tone="error">{preview.error}</Alert>;
  if (!preview.data) return <PageSpinner label="Loading" />;
  const data = preview.data;
  return (
    <>
      <PageHeader title={data.title} description={data.description} />
      <div className="flex flex-col gap-6">
        {notice ? <Alert tone="success">{notice}</Alert> : null}
        <Card
          title="Publishing"
          actions={
            canPublish && data.isActive ? (
              <Button
                size="sm"
                variant={data.publishedAt ? 'danger' : 'primary'}
                onClick={() => setConfirming(data.publishedAt ? 'unpublish' : 'publish')}
              >
                {data.publishedAt ? 'Hide from students' : 'Publish'}
              </Button>
            ) : null
          }
        >
          <p>
            {!data.isActive
              ? 'This module was removed from content/. Students don’t see it.'
              : data.publishedAt
                ? `Published ${formatDateTime(data.publishedAt)}: students see it.`
                : 'Not published yet: students don’t see it.'}
          </p>
          <div className="mt-4 max-w-xs">
            <SelectField
              label="Preview in"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </SelectField>
          </div>
        </Card>
        {data.lessons.map((lesson, index) => (
          <LessonPreview key={lesson.id} lesson={lesson} index={index} language={language} />
        ))}
        {data.project ? <ProjectPreview project={data.project} language={language} /> : null}
      </div>
      {confirming ? (
        <PublishDialog
          preview={data}
          publish={confirming === 'publish'}
          onClose={() => setConfirming(null)}
          onDone={(message) => {
            setConfirming(null);
            setNotice(message);
            preview.reload();
          }}
        />
      ) : null}
    </>
  );
}

/** Lesson Markdown as students see it (raw HTML left out, like the web app). */
export function Text({
  language,
  rtl = RTL.has(language),
  children,
}: {
  language: string;
  rtl?: boolean;
  children: string;
}) {
  return (
    <div
      lang={language}
      dir={rtl ? 'rtl' : 'ltr'}
      className="leading-relaxed [&:lang(ur)]:leading-[2.2] [&_code]:rounded [&_code]:bg-brand-100 [&_code]:px-1 [&_li]:ms-6 [&_li]:list-disc [&_p]:mt-2 [&_pre]:max-h-96 [&_pre]:overflow-auto [&_pre]:rounded-row [&_pre]:bg-code-bg [&_pre]:p-3 [&_pre]:text-ink"
    >
      <ReactMarkdown skipHtml>{children}</ReactMarkdown>
    </div>
  );
}

function Code({ files }: { files: Record<string, string> }) {
  const entries = Object.entries(files).filter(([, code]) => code.trim());
  if (!entries.length) return <p className="text-sm text-muted">Starts empty.</p>;
  return (
    <div className="flex flex-col gap-2">
      {entries.map(([name, code]) => (
        <div key={name}>
          <p className="text-sm font-semibold">{name}</p>
          <pre
            dir="ltr"
            className="max-h-96 overflow-auto rounded-well bg-code-bg p-3 text-sm text-ink"
          >
            {code}
          </pre>
        </div>
      ))}
    </div>
  );
}

function Missing() {
  return <Badge tone="warning">Not translated: English shown</Badge>;
}

function LessonPreview({
  lesson,
  index,
  language,
}: {
  lesson: Preview['lessons'][number];
  index: number;
  language: string;
}) {
  return (
    <Card title={`Lesson ${index + 1}: ${lesson.title}`}>
      <div className="flex flex-col gap-4">
        <p className="flex flex-wrap gap-2 text-sm">
          <Badge tone={lesson.isPremium ? 'brand' : 'neutral'}>
            {lesson.isPremium ? 'Premium' : 'Free'}
          </Badge>
          <Badge tone="neutral">{lesson.xp} XP</Badge>
          {lesson.video ? <Badge tone="neutral">Video: {lesson.video.provider}</Badge> : null}
          {lesson.translated ? null : <Missing />}
        </p>
        <Text language={language}>{lesson.summary}</Text>
        <details>
          <summary className="cursor-pointer font-semibold">Lesson text</summary>
          <div className="mt-2">
            <Text language={language}>{lesson.body}</Text>
          </div>
        </details>
        {lesson.challenges.map((challenge, i) => (
          <section key={challenge.id} className="rounded-row bg-raised p-4">
            <h3 className="font-semibold">
              Challenge {i + 1}: {challenge.title}{' '}
              <span className="text-sm font-normal text-muted">
                ({challenge.type}, {challenge.xp} XP)
              </span>
            </h3>
            {challenge.translated ? null : <Missing />}
            <div className="mt-2">
              <Text language={language}>{challenge.instructions}</Text>
            </div>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-semibold">Starter code</p>
                <Code files={challenge.starter} />
              </div>
              <div>
                <p className="text-sm font-semibold">Checks</p>
                <ul className="list-disc ps-6 text-sm">
                  {challenge.checks.map((check) => (
                    <li key={check} className="font-latin">
                      {check}
                    </li>
                  ))}
                </ul>
                {Object.keys(challenge.hints).length ? (
                  <>
                    <p className="mt-2 text-sm font-semibold">Hints</p>
                    <ul
                      className="list-disc ps-6 text-sm"
                      lang={language}
                      dir={RTL.has(language) ? 'rtl' : 'ltr'}
                    >
                      {Object.entries(challenge.hints).map(([key, hint]) => (
                        <li key={key}>{hint}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </div>
            </div>
          </section>
        ))}
      </div>
    </Card>
  );
}

function ProjectPreview({
  project,
  language,
}: {
  project: NonNullable<Preview['project']>;
  language: string;
}) {
  return (
    <Card title={`Project: ${project.title}`}>
      <div className="flex flex-col gap-3">
        <p className="flex flex-wrap gap-2 text-sm">
          <Badge tone={project.isPremium ? 'brand' : 'neutral'}>
            {project.isPremium ? 'Premium' : 'Free'}
          </Badge>
          <Badge tone="neutral">{project.xp} XP</Badge>
          {project.translated ? null : <Missing />}
        </p>
        <Text language={language}>{project.body}</Text>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold">Starter code</p>
            <Code files={project.starter} />
          </div>
          <div>
            <p className="text-sm font-semibold">Requirements</p>
            <ul className="list-disc ps-6 text-sm">
              {project.checks.map((check) => (
                <li key={check} className="font-latin">
                  {check}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
}

function PublishDialog({
  preview,
  publish,
  onClose,
  onDone,
}: {
  preview: Preview;
  publish: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [reason, setReason] = useState('');
  const action = useAction();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await action.run(() =>
      publish
        ? api.POST('/v1/admin/content/modules/{id}/publish', {
            params: { path: { id: preview.id } },
          })
        : api.POST('/v1/admin/content/modules/{id}/unpublish', {
            params: { path: { id: preview.id } },
            body: reason.trim() ? { reason: reason.trim() } : {},
          }),
    );
    if (ok) onDone(publish ? 'Published: students see it now.' : 'Hidden from students.');
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={publish ? `Publish “${preview.title}”?` : `Hide “${preview.title}” from students?`}
    >
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <p className="text-muted">
          {publish
            ? 'Students see it in their lesson map straight away. Check it in every language first.'
            : 'Students no longer see it or open its lessons. Their progress and projects stay, and publishing again brings it back.'}
        </p>
        {publish ? null : (
          <TextField
            label="Reason (optional)"
            hint="Kept in the audit log, e.g. “Fixing a mistake in lesson 2”."
            value={reason}
            maxLength={300}
            onChange={(e) => setReason(e.target.value)}
          />
        )}
        {action.error ? <Alert tone="error">{action.error}</Alert> : null}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant={publish ? 'primary' : 'danger'} loading={action.busy}>
            {publish ? 'Publish' : 'Hide'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
