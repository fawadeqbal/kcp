'use client';

import type { components } from '@kcp/api-client-ts';
import { clsx } from 'clsx';
import { useTranslations } from 'next-intl';
import { type FormEvent, useEffect, useId, useRef, useState } from 'react';
import { Alert, Badge, Button, Icon } from '@/components/ui';
import { api } from '@/lib/api';

type Quiz = components['schemas']['QuizDto'];
type QuizResult = components['schemas']['QuizResultDto'];

const codeBlock =
  'elev-sm overflow-x-auto whitespace-pre rounded-well bg-code-bg p-4 text-start font-mono text-[0.95rem] leading-relaxed text-ink';

/**
 * "Check yourself": the lesson's quick questions (the same ones the mobile app uses
 * for the daily practice). The server grades them; the answers never reach the page.
 */
export function LessonQuizzes({
  quizzes,
  language,
  textProps,
}: {
  quizzes: Quiz[];
  /** The language to ask the server for (the page's language). */
  language: string;
  /** lang/dir for texts that fell back to English. */
  textProps: { lang?: string; dir?: 'ltr' | 'rtl' };
}) {
  const t = useTranslations('lesson.quiz');
  if (quizzes.length === 0) return null;
  return (
    <section aria-labelledby="lesson-quizzes" className="flex flex-col gap-4">
      <div>
        <h2 id="lesson-quizzes" className="text-3xl">
          {t('title')}
        </h2>
        <p className="mt-1 text-muted">{t('intro')}</p>
      </div>
      <ol className="flex flex-col gap-4">
        {quizzes.map((quiz, index) => (
          <li key={quiz.id}>
            <QuizCard
              quiz={quiz}
              number={index + 1}
              total={quizzes.length}
              language={language}
              textProps={textProps}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

function QuizCard({
  quiz,
  number,
  total,
  language,
  textProps,
}: {
  quiz: Quiz;
  number: number;
  total: number;
  language: string;
  textProps: { lang?: string; dir?: 'ltr' | 'rtl' };
}) {
  const t = useTranslations('lesson.quiz');
  const formId = useId();
  const [order, setOrder] = useState(() => quiz.lines.map((line) => line.id));
  const [choice, setChoice] = useState<string | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [solved, setSolved] = useState(quiz.solved);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [moved, setMoved] = useState<{ id: string; position: number; up: boolean } | null>(null);
  const moveButtons = useRef(new Map<string, HTMLButtonElement>());
  const done = result?.correct === true;
  const locked = busy || done;

  // Keep focus on the line that was moved (moving a node can drop it).
  useEffect(() => {
    if (!moved) return;
    const button =
      moveButtons.current.get(`${moved.id}:${moved.up ? 'up' : 'down'}`) ??
      moveButtons.current.get(`${moved.id}:${moved.up ? 'down' : 'up'}`);
    button?.focus();
  }, [moved]);

  const lineText = new Map(quiz.lines.map((line) => [line.id, line.text]));

  const move = (index: number, by: -1 | 1) => {
    const target = index + by;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target]!, next[index]!];
    setOrder(next);
    setMoved({ id: next[target]!, position: target + 1, up: by === -1 });
    setResult(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (locked) return;
    const body =
      quiz.kind === 'ORDER'
        ? { order }
        : quiz.kind === 'BUG'
          ? { line: Number(choice) }
          : { option: choice ?? undefined };
    if (quiz.kind !== 'ORDER' && !choice) return;
    setBusy(true);
    setFailed(false);
    try {
      const { data } = await api.POST('/v1/learning/quizzes/{id}/answers', {
        params: { path: { id: quiz.id }, query: { lang: language } },
        body,
      });
      if (!data) {
        setFailed(true);
        return;
      }
      setResult(data);
      if (data.correct) setSolved(true);
      // Show the right answer in place, so the student can see it.
      if (data.reveal) {
        if (data.reveal.order) setOrder(data.reveal.order);
        if (data.reveal.line) setChoice(String(data.reveal.line));
        if (data.reveal.option) setChoice(data.reveal.option);
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const help =
    quiz.kind === 'ORDER'
      ? t('orderHelp')
      : quiz.kind === 'BUG'
        ? t('bugHelp')
        : quiz.kind === 'OUTPUT'
          ? t('outputHelp')
          : t('choiceHelp');

  return (
    <form
      onSubmit={submit}
      aria-labelledby={`${formId}-prompt`}
      className="flex flex-col gap-4 rounded-card bg-surface p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold tracking-[0.1em] text-brand-text uppercase">
          {t('questionOf', { number: String(number), total: String(total) })}
        </p>
        {solved ? <Badge tone="success">{t('solved')}</Badge> : null}
      </div>
      <p id={`${formId}-prompt`} className="font-display text-2xl" {...textProps}>
        {quiz.prompt}
      </p>

      {quiz.kind === 'ORDER' ? (
        <fieldset className="flex flex-col gap-2" disabled={locked}>
          <legend className="mb-2 text-sm text-muted">{help}</legend>
          <ol className="flex flex-col gap-2">
            {order.map((id, index) => (
              <li
                key={id}
                className="flex items-center gap-2 rounded-row bg-raised py-1.5 ps-3 pe-1.5"
              >
                <span className="w-6 text-center text-sm text-muted" aria-hidden="true">
                  {index + 1}
                </span>
                <code
                  dir="ltr"
                  className="min-w-0 flex-1 overflow-x-auto whitespace-pre font-mono text-sm"
                >
                  {lineText.get(id)}
                </code>
                <button
                  type="button"
                  ref={(el) => {
                    if (el) moveButtons.current.set(`${id}:up`, el);
                    else moveButtons.current.delete(`${id}:up`);
                  }}
                  onClick={() => move(index, -1)}
                  disabled={locked || index === 0}
                  aria-label={t('moveUp', { number: String(index + 1) })}
                  className="flex size-11 items-center justify-center rounded-full text-lg hover:bg-ink/7 disabled:opacity-35"
                >
                  <Icon name="chevU" />
                </button>
                <button
                  type="button"
                  ref={(el) => {
                    if (el) moveButtons.current.set(`${id}:down`, el);
                    else moveButtons.current.delete(`${id}:down`);
                  }}
                  onClick={() => move(index, 1)}
                  disabled={locked || index === order.length - 1}
                  aria-label={t('moveDown', { number: String(index + 1) })}
                  className="flex size-11 items-center justify-center rounded-full text-lg hover:bg-ink/7 disabled:opacity-35"
                >
                  <Icon name="chevD" />
                </button>
              </li>
            ))}
          </ol>
          <p className="sr-only" aria-live="polite">
            {moved ? t('moved', { position: String(moved.position) }) : ''}
          </p>
        </fieldset>
      ) : null}

      {quiz.kind === 'BUG' ? (
        <fieldset className="flex flex-col gap-2" disabled={locked}>
          <legend className="mb-2 text-sm text-muted">{help}</legend>
          {quiz.lines.map((line) => (
            <label
              key={line.id}
              className={clsx(
                'flex min-h-12 cursor-pointer items-center gap-3 rounded-row border-2 px-3.5 py-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand has-[:focus-visible]:outline-solid',
                choice === line.id ? 'border-primary bg-brand-100' : 'border-transparent bg-raised',
              )}
            >
              <input
                type="radio"
                name={`${formId}-line`}
                value={line.id}
                checked={choice === line.id}
                onChange={() => {
                  setChoice(line.id);
                  setResult(null);
                }}
                className="size-5 accent-primary"
              />
              <span className="sr-only">{t('line', { number: line.id })}</span>
              <span className="w-6 text-center text-sm text-muted" aria-hidden="true">
                {line.id}
              </span>
              <code
                dir="ltr"
                className="min-w-0 flex-1 overflow-x-auto whitespace-pre font-mono text-sm"
              >
                {line.text}
              </code>
            </label>
          ))}
        </fieldset>
      ) : null}

      {quiz.kind === 'OUTPUT' || quiz.kind === 'CHOICE' ? (
        <>
          {quiz.lines.length > 0 ? (
            <pre dir="ltr" className={codeBlock}>
              {quiz.lines.map((line) => line.text).join('\n')}
            </pre>
          ) : null}
          <fieldset className="flex flex-col gap-2" disabled={locked}>
            <legend className="mb-2 text-sm text-muted">{help}</legend>
            {quiz.options.map((option) => (
              <label
                key={option.id}
                className={clsx(
                  'flex min-h-13 cursor-pointer items-center gap-3 rounded-row border-2 px-4 py-2.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand has-[:focus-visible]:outline-solid',
                  choice === option.id
                    ? result?.correct
                      ? 'border-sage bg-sage-100 font-bold text-sage-900'
                      : 'border-primary bg-brand-100'
                    : 'border-transparent bg-raised',
                )}
              >
                <input
                  type="radio"
                  name={`${formId}-option`}
                  value={option.id}
                  checked={choice === option.id}
                  onChange={() => {
                    setChoice(option.id);
                    setResult(null);
                  }}
                  className="size-5 shrink-0 accent-primary"
                />
                {option.code !== null ? (
                  <code
                    dir="ltr"
                    className="min-w-0 flex-1 overflow-x-auto whitespace-pre font-mono text-sm"
                  >
                    {option.code}
                  </code>
                ) : (
                  <span {...textProps}>{option.text}</span>
                )}
              </label>
            ))}
          </fieldset>
        </>
      ) : null}

      {result ? (
        <Alert tone={result.correct ? 'success' : result.reveal ? 'info' : 'warning'}>
          <p className="font-semibold">
            {result.correct
              ? result.xpAwarded > 0
                ? t('correctXp', { xp: String(result.xpAwarded) })
                : t('correct')
              : result.reveal
                ? t('revealed')
                : t('wrong')}
          </p>
          {result.explanation ? (
            <p className="mt-1 text-ink" {...textProps}>
              {result.explanation}
            </p>
          ) : null}
        </Alert>
      ) : null}
      {failed ? <Alert tone="error">{t('failed')}</Alert> : null}

      {!done ? (
        <Button
          type="submit"
          size="lg"
          className="self-start"
          disabled={busy || (quiz.kind !== 'ORDER' && !choice)}
        >
          {busy ? t('checking') : t('check')}
        </Button>
      ) : null}
    </form>
  );
}
