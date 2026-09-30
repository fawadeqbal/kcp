'use client';

import type { components } from '@kcp/api-client-ts';
import type { CodeFiles } from '@kcp/checks';
import { directionOf, isLocale } from '@kcp/i18n';
import { clsx } from 'clsx';
import { useLocale, useTranslations } from 'next-intl';
import { type ReactNode, type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  buttonClass,
  Icon,
  type IconName,
  PageSpinner,
} from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { api, errorCode } from '@/lib/api';
import { useAccount } from '@/lib/use-account';
import { ChallengeWorkspace } from './challenge-workspace';
import { LessonQuizzes } from './lesson-quizzes';
import { Markdown } from './markdown';
import { PremiumLocked } from './premium-locked';
import { onTabKeyDown } from './tabs';
import { type SaveState, useSaveText } from './workspace';
import { useStreak, WorkspaceHeader } from './workspace-header';

type Lesson = components['schemas']['LessonDto'];
type Video = components['schemas']['VideoDto'];
type SubmissionResult = components['schemas']['SubmissionResultDto'];

/** Where the student is in a lesson: the intro, a "try it" step, or the quick questions. */
type View = 'intro' | 'quiz' | number;

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
 * A lesson, as a full-screen workspace: a short video and explainer, then "try it"
 * steps (instructions, code editor, live preview), then a few quick questions. The
 * stepper at the top moves between them. The lesson counts as done once every step's
 * checks have passed (the questions are extra practice).
 */
export function LessonPlayer({ lessonId }: { lessonId: string }) {
  const t = useTranslations('lesson');
  const locale = useLocale();
  const user = useAccount('STUDENT');
  const signedIn = user !== null;
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [failure, setFailure] = useState<'notFound' | 'loadFailed' | 'premium' | null>(null);
  const [view, setView] = useState<View>('intro');
  const [passed, setPassed] = useState<ReadonlySet<string>>(new Set());
  const [completed, setCompleted] = useState<{
    nextLessonId: string | null;
    justNow: boolean;
  } | null>(null);
  const [focusStepTitle, setFocusStepTitle] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const saveText = useSaveText(saveState);
  const { streak, refresh: refreshStreak } = useStreak();
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
        // A new lesson starts with its video and explainer; a started one where the
        // student left off.
        setView(data.status === 'NOT_STARTED' || firstOpen === -1 ? 'intro' : firstOpen);
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
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-16">
        <Alert tone={failure === 'notFound' ? 'info' : 'error'}>{t(failure)}</Alert>
        <Link href="/learn" className={clsx(buttonClass('secondary'), 'self-start')}>
          {t('backToMap')}
        </Link>
      </div>
    );
  }
  if (!user || !lesson) return <PageSpinner />;

  const text = languageProps(lesson.language, locale);
  const stepCount = lesson.challenges.length;
  const challenge = typeof view === 'number' ? lesson.challenges[view] : undefined;

  const onPassed = (result: SubmissionResult) => {
    if (!challenge) return;
    setPassed((current) => new Set(current).add(challenge.id));
    refreshStreak();
    if (result.lessonCompleted) {
      setCompleted({ nextLessonId: result.nextLessonId, justNow: true });
    }
  };

  const select = (next: View, focusTitle = false) => {
    setFocusStepTitle(focusTitle);
    setView(next);
  };

  // The stepper's tabs: the intro, each step, and the quick questions (if any).
  const tabs: View[] = ['intro', ...lesson.challenges.map((_, i) => i)];
  if (lesson.quizzes.length > 0) tabs.push('quiz');
  const current = tabs.indexOf(view);

  const completion = completed ? (
    <CompletionCard
      lesson={lesson}
      nextLessonId={completed.nextLessonId}
      headingRef={completeHeading}
      onQuiz={lesson.quizzes.length > 0 ? () => select('quiz') : null}
    />
  ) : null;

  return (
    <article className="flex min-h-dvh flex-1 flex-col xl:h-dvh">
      <WorkspaceHeader
        context={`${t('lessonOf', {
          number: String(lesson.number),
          total: String(lesson.lessonCount),
        })} · ${lesson.moduleTitle}`}
        title={lesson.title}
        badge={completed ? <Badge tone="success">{t('completedBadge')}</Badge> : null}
        saveText={saveText}
        saveState={saveState}
        streak={streak}
        steps={
          <div role="tablist" aria-label={t('steps')} className="flex w-max items-center gap-1.5">
            {tabs.map((tab, index) => (
              <StepTab
                key={String(tab)}
                tab={tab}
                index={index}
                count={tabs.length}
                selected={index === current}
                done={
                  typeof tab === 'number'
                    ? passed.has(lesson.challenges[tab]!.id)
                    : tab === 'intro'
                      ? lesson.status !== 'NOT_STARTED' || passed.size > 0 || index < current
                      : false
                }
                first={index === 0}
                onSelect={(i) => select(tabs[i]!)}
              />
            ))}
          </div>
        }
      />

      <div
        id="lesson-step-panel"
        role="tabpanel"
        aria-labelledby={`lesson-tab-${String(view)}`}
        className="flex min-h-0 flex-1 flex-col"
      >
        {view === 'intro' ? (
          <IntroPanel
            lesson={lesson}
            textProps={text}
            completion={completion}
            onStart={stepCount > 0 ? () => select(0, true) : null}
          />
        ) : null}
        {challenge && typeof view === 'number' ? (
          <ChallengeWorkspace
            key={challenge.id}
            challenge={challenge}
            kicker={`${t('step', { number: String(view + 1) })} · ${t('tryIt')}`}
            initialCode={
              codeByStep.current.get(challenge.id) ?? challenge.draft ?? challenge.starter
            }
            isStudent
            focusTitle={focusStepTitle}
            onCodeChange={rememberCode}
            onSaveState={setSaveState}
            onPassed={onPassed}
            after={
              completed?.justNow ? (
                completion
              ) : passed.has(challenge.id) && view < stepCount - 1 ? (
                <Button size="lg" onClick={() => select(view + 1, true)}>
                  {t('nextStep')}
                  <Icon name="arrow" />
                </Button>
              ) : passed.has(challenge.id) && view === stepCount - 1 && lesson.quizzes.length ? (
                <Button variant="secondary" onClick={() => select('quiz')}>
                  <Icon name="list" />
                  {t('quiz.title')}
                </Button>
              ) : null
            }
          />
        ) : null}
        {view === 'quiz' ? (
          <div className="flex-1 overflow-y-auto px-4 pb-10 sm:px-6">
            <div className="mx-auto flex max-w-3xl flex-col gap-6 pt-4">
              {completion}
              <LessonQuizzes quizzes={lesson.quizzes} language={locale} textProps={text} />
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

/** One tab of the stepper: an icon for the intro and the questions, a number for steps. */
function StepTab({
  tab,
  index,
  count,
  selected,
  done,
  first,
  onSelect,
}: {
  tab: View;
  index: number;
  count: number;
  selected: boolean;
  done: boolean;
  first: boolean;
  onSelect: (index: number) => void;
}) {
  const t = useTranslations('lesson');
  const label =
    tab === 'intro'
      ? t('intro')
      : tab === 'quiz'
        ? t('quiz.title')
        : t(done ? 'stepDone' : 'step', { number: String(tab + 1) });
  const icon: IconName | null =
    tab === 'intro' ? 'play' : tab === 'quiz' ? 'list' : done ? 'check' : null;
  return (
    <>
      {first ? null : (
        <span
          aria-hidden="true"
          className={clsx('h-0.75 w-5 shrink-0 rounded-full', done ? 'bg-sage' : 'bg-track')}
        />
      )}
      <button
        id={`lesson-tab-${String(tab)}`}
        type="button"
        role="tab"
        aria-selected={selected}
        aria-controls="lesson-step-panel"
        aria-label={label}
        title={label}
        tabIndex={selected ? 0 : -1}
        onClick={() => onSelect(index)}
        onKeyDown={(event) => onTabKeyDown(event, count, index, onSelect)}
        className={clsx(
          'grid h-8 min-w-8 shrink-0 place-items-center rounded-full text-[0.8rem] font-bold transition-colors',
          selected
            ? 'bg-primary px-3.5 text-on-primary'
            : done
              ? 'bg-sage text-on-primary hover:bg-sage-600'
              : 'bg-track text-muted hover:bg-sand-300 hover:text-ink',
        )}
      >
        {selected && typeof tab === 'number' ? (
          <span aria-hidden="true">{t('step', { number: String(tab + 1) })}</span>
        ) : icon ? (
          <Icon name={icon} className="text-[0.95rem]" />
        ) : (
          <span aria-hidden="true">{typeof tab === 'number' ? tab + 1 : ''}</span>
        )}
      </button>
    </>
  );
}

/** The start of a lesson: the video and the explainer, then "Try it". */
function IntroPanel({
  lesson,
  textProps,
  completion,
  onStart,
}: {
  lesson: Lesson;
  textProps: { lang?: string; dir?: 'ltr' | 'rtl' };
  completion: ReactNode;
  onStart: (() => void) | null;
}) {
  const t = useTranslations('lesson');
  const video = lesson.video ? videoUrl(lesson.video) : null;
  return (
    <div className="flex-1 overflow-y-auto px-4 pb-10 sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-5 pt-2">
        {completion}
        <p className="text-lg text-muted" {...textProps}>
          {lesson.summary}
        </p>
        {video ? (
          <section aria-labelledby="lesson-video" className="flex flex-col gap-3">
            <h2 id="lesson-video" className="sr-only">
              {t('video')}
            </h2>
            <div className="aspect-video w-full overflow-hidden rounded-card bg-sand-900">
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
        <div className="rounded-card bg-surface p-6 sm:p-8" {...textProps}>
          <Markdown>{lesson.body}</Markdown>
        </div>
        {onStart ? (
          <Button size="lg" className="self-start" onClick={onStart}>
            {t('startSteps')}
            <Icon name="arrow" />
          </Button>
        ) : null}
        <nav aria-label={t('lessonNav')} className="flex flex-wrap justify-between gap-3 pt-4">
          {lesson.previousLessonId ? (
            <Link href={`/learn/${lesson.previousLessonId}`} className={buttonClass('ghost')}>
              <Icon name="chevL" />
              {t('previousLesson')}
            </Link>
          ) : (
            <span />
          )}
          {lesson.nextLessonId ? (
            <Link href={`/learn/${lesson.nextLessonId}`} className={buttonClass('ghost')}>
              {t('nextLesson')}
              <Icon name="chevR" />
            </Link>
          ) : null}
        </nav>
      </div>
    </div>
  );
}

/** "Lesson complete!": where to go next. */
function CompletionCard({
  lesson,
  nextLessonId,
  headingRef,
  onQuiz,
}: {
  lesson: Lesson;
  nextLessonId: string | null;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onQuiz: (() => void) | null;
}) {
  const t = useTranslations('lesson');
  return (
    <section className="flex flex-col gap-3 rounded-row bg-sage-100 p-5 text-sage-900 motion-safe:animate-[kcp-pop_300ms_ease-out]">
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="flex items-center gap-2.5 text-2xl outline-none"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sage text-base text-on-primary">
          <Icon name="star" />
        </span>
        {t('lessonComplete')}
      </h2>
      <p className="text-sm text-sage-800">{t('lessonCompleteBody', { title: lesson.title })}</p>
      <div className="flex flex-wrap gap-2.5">
        {nextLessonId ? (
          <Link href={`/learn/${nextLessonId}`} className={buttonClass('primary')}>
            {t('nextLesson')}
            <Icon name="arrow" />
          </Link>
        ) : null}
        <Link href="/learn" className={buttonClass(nextLessonId ? 'secondary' : 'primary')}>
          {t('backToMap')}
        </Link>
        {onQuiz ? (
          <Button variant="ghost" onClick={onQuiz}>
            <Icon name="list" />
            {t('quiz.title')}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
