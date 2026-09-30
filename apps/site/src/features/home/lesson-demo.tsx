import { getTranslations } from 'next-intl/server';
import { CheckIcon, StarIcon } from '@/components/icons';

/**
 * A picture of a lesson step, drawn in HTML (no screenshot): the task, a few lines of code
 * and the automatic check. Code always reads left to right, also on Arabic and Urdu pages.
 */
export async function LessonDemo() {
  const t = await getTranslations('home.demo');
  return (
    <figure className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-xl shadow-brand-600/10">
        <div className="flex items-center gap-3 border-b border-line bg-canvas px-4 py-3">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-line" />
            <span className="size-2.5 rounded-full bg-line" />
            <span className="size-2.5 rounded-full bg-line" />
          </span>
          <span className="truncate text-sm font-medium text-muted">{t('lesson')}</span>
        </div>
        <div className="flex flex-col gap-4 p-5">
          <p className="font-medium">{t('task')}</p>
          <pre
            dir="ltr"
            className="overflow-x-auto rounded-xl bg-ink px-4 py-4 text-start font-mono text-sm leading-7 text-white"
          >
            <code>
              <span className="text-accent">&lt;h1&gt;</span>
              Hello, world!
              <span className="text-accent">&lt;/h1&gt;</span>
              {'\n'}
              <span className="text-accent">&lt;p&gt;</span>I build websites.
              <span className="text-accent">&lt;/p&gt;</span>
            </code>
          </pre>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-sm font-semibold text-success">
              <CheckIcon className="size-4" />
              {t('passed')}
            </span>
            <span className="inline-flex items-center gap-2 text-sm font-semibold">
              {/* "+10 XP" keeps its order in Arabic and Urdu. */}
              <span dir="ltr" className="font-latin rounded-full bg-accent px-3 py-1 text-ink">
                {t('xp')}
              </span>
              <span className="inline-flex items-center gap-1 text-muted">
                <StarIcon className="size-4 text-accent" />
                {t('streak')}
              </span>
            </span>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-sm text-muted">{t('caption')}</figcaption>
    </figure>
  );
}
