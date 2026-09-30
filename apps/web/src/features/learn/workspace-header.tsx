'use client';

import { clsx } from 'clsx';
import { useTranslations } from 'next-intl';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { BackLink } from '@/components/back-link';
import { FeedbackButton } from '@/components/feedback-button';
import { Avatar, Icon } from '@/components/ui';
import { api } from '@/lib/api';
import { useAccount } from '@/lib/use-account';

/** The student's streak, for the chip in a workspace's header; `refresh` after a pass. */
export function useStreak() {
  const signedIn = useAccount('STUDENT') !== null;
  const [streak, setStreak] = useState<number | null>(null);
  const refresh = useCallback(() => {
    api
      .GET('/v1/progress')
      .then(({ data }) => {
        if (data) setStreak(data.streak.current);
      })
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    if (signedIn) refresh();
  }, [signedIn, refresh]);
  return { streak, refresh };
}

/**
 * The top of a lesson or project workspace (it replaces the site header there): back to
 * "My learning", where you are, the steps, whether the code is saved, the streak.
 */
export function WorkspaceHeader({
  context,
  title,
  titleId,
  badge,
  steps,
  saveText,
  saveState,
  streak,
}: {
  /** "Lesson 4 of 5 · A first website". */
  context: ReactNode;
  title: string;
  titleId?: string;
  /** e.g. "Done", next to the title. */
  badge?: ReactNode;
  /** The stepper (lessons). */
  steps?: ReactNode;
  saveText: string;
  saveState: 'idle' | 'saving' | 'saved' | 'failed';
  streak: number | null;
}) {
  const tl = useTranslations('lesson');
  const tp = useTranslations('progress');
  const user = useAccount('STUDENT');
  return (
    <header className="print-hidden flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 sm:px-6">
      <BackLink href="/learn">{tl('backToLearning')}</BackLink>
      <div className="flex min-w-0 flex-col">
        <p className="truncate text-xs font-semibold text-muted">{context}</p>
        <div className="flex items-center gap-2">
          <h1 id={titleId} className="truncate text-xl leading-tight">
            {title}
          </h1>
          {badge}
        </div>
      </div>
      {steps ? (
        <div className="order-last -mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 xl:order-none xl:ms-4 xl:w-auto xl:px-0 sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6">
          {steps}
        </div>
      ) : null}
      <div className="ms-auto flex items-center gap-2.5">
        <p
          aria-live="polite"
          className={clsx(
            'flex items-center gap-1.5 text-sm font-semibold',
            saveState === 'failed' ? 'text-danger' : 'text-muted',
          )}
        >
          {saveText ? (
            <Icon
              name={saveState === 'failed' ? 'alert' : 'cloud'}
              className={clsx('text-base', saveState !== 'failed' && 'text-sage')}
            />
          ) : null}
          {saveText}
        </p>
        {streak !== null ? (
          <p
            className="flex min-h-8 items-center gap-1.5 rounded-full bg-brand-100 px-3 text-sm font-bold text-brand-800"
            title={tp('streak')}
          >
            <Icon name="flame" className="text-sm" />
            <span className="sr-only">{tp('streak')}: </span>
            {streak}
          </p>
        ) : null}
        <FeedbackButton inline />
        {user ? (
          <Avatar
            avatarKey={user.student?.avatarKey ?? 'rocket'}
            size="sm"
            className="max-sm:hidden"
          />
        ) : null}
      </div>
    </header>
  );
}
