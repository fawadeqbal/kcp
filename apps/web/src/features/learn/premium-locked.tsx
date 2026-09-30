'use client';

import { clsx } from 'clsx';
import { useTranslations } from 'next-intl';
import { buttonClass } from '@/components/ui';
import { Link } from '@/i18n/navigation';

/** Shown instead of a premium lesson or project to a student without premium. */
export function PremiumLocked({ kind }: { kind: 'lesson' | 'project' }) {
  const t = useTranslations('learn');
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-8 text-center">
      <span aria-hidden="true" className="text-5xl">
        🔒
      </span>
      <h1 className="text-2xl font-bold">
        {kind === 'lesson' ? t('lockedLessonTitle') : t('lockedProjectTitle')}
      </h1>
      <p className="text-muted">{t('lockedBody')}</p>
      <Link href="/learn" className={clsx(buttonClass('secondary'))}>
        {t('lockedBack')}
      </Link>
    </div>
  );
}
