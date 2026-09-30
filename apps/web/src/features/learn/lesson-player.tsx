'use client';

import type { components } from '@kcp/api-client-ts';
import type { CodeFiles } from '@kcp/checks';
import { directionOf, isLocale } from '@kcp/i18n';
import { clsx } from 'clsx';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Badge, Button, buttonClass, Card, PageSpinner } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { api, errorCode } from '@/lib/api';
import { useAccount } from '@/lib/use-account';
import { ChallengeWorkspace } from './challenge-workspace';
import { Markdown } from './markdown';
import { PremiumLocked } from './premium-locked';
import { onTabKeyDown } from './tabs';

type Lesson = components['schemas']['LessonDto'];
type Video = components['schemas']['VideoDto'];
type SubmissionResult = components['schemas']['SubmissionResultDto'];

/** Videos are streamed from YouTube (privacy-enhanced mode) or Cloudflare Stream. */
function videoUrl(video: Video): string | null {
  const id = encodeURIComponent(video.id);
  if (video.provider === 'youtube') return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
  if (video.provider === 'cloudflare') return `https://iframe.videodelivery.net/${id}`;
  return null;
}

/** Texts that fell back to English keep English direction inside an Arabic or Urdu page. */
function languageProps(language: string, locale: string) {
  if (language === locale || !isLocale(language)) return {};
  return { lang: language, dir: directionOf(language) };
}

/**
 * A lesson: a short video, an explainer, then "try it" steps with a code editor.
 * The lesson counts as done once every step's checks have passed.
 */
export function LessonPlayer({ lessonId }: { lessonId: string }) {
  const t = useTranslations('lesson');
  const locale = useLocale();
  const user = useAccount('STUDENT');
  const signedIn = user !== null;
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [failure, setFailure] = useState<'notFound' | 'loadFailed' | 'premium' | null>(null);
  const [step, setStep] = useState(0);
  const [passed, setPassed] = useState<ReadonlySet<string>>(new Set());
  const [completed, setCompleted] = useState<{
    nextLessonId: string | null;
    justNow: boolean;
  } | null>(null);
  const [focusStepTitle, setFocusStepTitle] = useState(false);
  const completeHeading = useRef<HTMLHeadingElement>(null);
  /** The latest code of each step, so going back to a step shows what the student wrote. */
  const codeByStep = useRef(new Map<string, CodeFiles>());
  const rememberCode = useCallback((challengeId: string, code: CodeFiles) => {
    codeByStep.current.set(challengeId, code);
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    setLesson(null);
    setFailure(null);
    api
      .GET('/v1/learning/lessons/{id}', {
        params: { path: { id: lessonId }, query: { lang: locale } },
      })
      .then(({ data, error, response }) => {
        if (cancelled) return;
        if (!data) {
          setFailure(
            errorCode(error) === 'PREMIUM_REQUIRED'
              ? 'premium'
              : response.status === 404
                ? 'notFound'
                : 'loadFailed',
          );
          return;
        }
        const done = new Set(data.challenges.filter((c) => c.passed).map((c) => c.id));
        const firstOpen = data.challenges.findIndex((c) => !done.has(c.id));
        setLesson(data);
        setPassed(done);
        setStep(firstOpen === -1 ? 0 : firstOpen);
        setCompleted(
          data.status === 'COMPLETED' ? { nextLessonId: data.nextLessonId, justNow: false } : null,
        );
        if (data.status !== 'COMPLETED') {
          // Also completes a lesson that has nothing left to do (lessons can change).
          api
            .POST('/v1/learning/lessons/{id}/start', { params: { path: { id: data.id } } })
            .then(({ data: progress }) => {
              if (!cancelled && progress?.status === 'COMPLETED') {
                setCompleted({ nextLessonId: data.nextLessonId, justNow: false });
              }
            })
            .catch(() => undefined);
        }
      })
      .catch(() => {
        if (!cancelled) setFailure('loadFailed');
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn, lessonId, locale]);

  // Announce the finished lesson by moving focus to it.
  useEffect(() => {
    if (completed?.justNow) completeHeading.current?.focus();
  }, [completed]);

  if (failure === 'premium') return <PremiumLocked kind="lesson" />;
  if (failure) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <Alert tone={failure === 'notFound' ? 'info' : 'error'}>{t(failure)}</Alert>
        <Link href="/learn" className={clsx(buttonClass('secondary'), 'self-start')}>
          {t('backToMap')}
        </Link>
      </div>
    );
  }
  if (!user || !lesson) return <PageSpinner />;

  const text = languageProps(lesson.language, locale);
  const challenge = lesson.challenges[step];
  const video = lesson.video ? videoUrl(lesson.video) : null;

  const onPassed = (result: SubmissionResult) => {
    if (!challenge) return;
    setPassed((current) => new Set(current).add(challenge.id));
    if (result.lessonCompleted) {
      setCompleted({ nextLessonId: result.nextLessonId, justNow: true });
    }
  };

  const selectStep = (index: number, focusTitle = false) => {
    setFocusStepTitle(focusTitle);
    setStep(index);
  };
  const stepCount = lesson.challenges.length;

  return (
    <article className="mx-auto flex max-w-6xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <nav aria-label={t('backToLearning')} className="text-sm">
          <ol className="flex flex-wrap items-center gap-2 text-muted">
            <li>
              <Link
                href="/learn"
                className="font-semibold text-brand-700 underline underline-offset-4"
              >
                {t('backToLearning')}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li {...text}>{lesson.moduleTitle}</li>
          </ol>
        </nav>
        <p className="text-sm font-semibold text-brand-700">
          {t('lessonOf', { number: String(lesson.number), total: String(lesson.lessonCount) })}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold" {...text}>
            {lesson.title}
          </h1>
          {completed ? <Badge tone="success">{t('completedBadge')}</Badge> : null}
        </div>
        <p className="max-w-3xl text-lg text-muted" {...text}>
          {lesson.summary}
        </p>
      </header>

      {video ? (
        <section aria-labelledby="lesson-video" className="flex flex-col gap-3">
          <h2 id="lesson-video" className="text-xl font-bold">
            {t('video')}
          </h2>
          <div className="aspect-video w-full max-w-3xl overflow-hidden rounded-[var(--radius-card)] bg-ink">
            <iframe
              src={video}
              title={`${t('video')}: ${lesson.title}`}
              className="h-full w-full"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
        </section>
      ) : null}

      <Card className="max-w-3xl">
        <div {...text}>
          <Markdown>{lesson.body}</Markdown>
        </div>
      </Card>

      {lesson.challenges.length > 0 && challenge ? (
        <section aria-labelledby="lesson-steps" className="flex flex-col gap-4">
          <h2 id="lesson-steps" className="text-2xl font-bold">
            {t('tryIt')}
          </h2>
          {lesson.challenges.length > 1 ? (
            <div role="tablist" aria-label={t('tryIt')} className="flex flex-wrap gap-2">
              {lesson.challenges.map((c, index) => {
                const isDone = passed.has(c.id);
                const label = t(isDone ? 'stepDone' : 'step', { number: String(index + 1) });
                return (
                  <button
                    key={c.id}
                    id={`lesson-step-${index}`}
                    type="button"
                    role="tab"
                    aria-selected={index === step}
                    aria-controls="lesson-step-panel"
                    aria-label={label}
                    tabIndex={index === step ? 0 : -1}
                    onClick={() => selectStep(index)}
                    onKeyDown={(event) => onTabKeyDown(event, stepCount, index, selectStep)}
                    className={clsx(
                      'flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold',
                      index === step
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-line bg-surface hover:border-brand-600',
                    )}
                  >
                    <span aria-hidden="true">{isDone ? '✓' : index + 1}</span>
                    <span aria-hidden="true">{t('step', { number: String(index + 1) })}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          <div
            id="lesson-step-panel"
            role={stepCount > 1 ? 'tabpanel' : undefined}
            aria-labelledby={stepCount > 1 ? `lesson-step-${step}` : undefined}
          >
            <ChallengeWorkspace
              key={challenge.id}
              challenge={challenge}
              initialCode={
                codeByStep.current.get(challenge.id) ?? challenge.draft ?? challenge.starter
              }
              isStudent
              focusTitle={focusStepTitle}
              onCodeChange={rememberCode}
              onPassed={onPassed}
            />
          </div>

          {passed.has(challenge.id) &&
          step < lesson.challenges.length - 1 &&
          !completed?.justNow ? (
            <Button className="self-start" onClick={() => selectStep(step + 1, true)}>
              {t('nextStep')}
            </Button>
          ) : null}
        </section>
      ) : null}

      {completed ? (
        <section className="rounded-[var(--radius-card)] border border-success/30 bg-success/10 p-5 sm:p-6">
          <h2 ref={completeHeading} tabIndex={-1} className="text-2xl font-bold outline-none">
            {t('lessonComplete')}
          </h2>
          <p className="mt-2 text-muted">{t('lessonCompleteBody', { title: lesson.title })}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {completed.nextLessonId ? (
              <Link href={`/learn/${completed.nextLessonId}`} className={buttonClass('primary')}>
                {t('nextLesson')}
              </Link>
            ) : null}
            <Link
              href="/learn"
              className={buttonClass(completed.nextLessonId ? 'secondary' : 'primary')}
            >
              {t('backToMap')}
            </Link>
          </div>
        </section>
      ) : null}

      <nav
        aria-label={t('lessonNav')}
        className="flex flex-wrap justify-between gap-3 border-t border-line pt-6"
      >
        {lesson.previousLessonId ? (
          <Link href={`/learn/${lesson.previousLessonId}`} className={buttonClass('ghost')}>
            <span aria-hidden="true" className="inline-block rtl:-scale-x-100">
              ←
            </span>{' '}
            {t('previousLesson')}
          </Link>
        ) : (
          <span />
        )}
        {lesson.nextLessonId ? (
          <Link href={`/learn/${lesson.nextLessonId}`} className={buttonClass('ghost')}>
            {t('nextLesson')}{' '}
            <span aria-hidden="true" className="inline-block rtl:-scale-x-100">
              →
            </span>
          </Link>
        ) : null}
      </nav>
    </article>
  );
}
