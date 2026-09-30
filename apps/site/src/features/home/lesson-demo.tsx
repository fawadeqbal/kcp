import { Avatar } from '@kcp/ui';
import { getTranslations } from 'next-intl/server';
import { CheckIcon, FlameIcon } from '@/components/icons';

/**
 * A picture of a lesson step, drawn in HTML (no screenshot): the task, a line of code,
 * what it shows and the automatic check, on two soft circles, with the streak beside
 * it. Code always reads left to right, also on Arabic and Urdu pages.
 */
export async function LessonDemo() {
  const t = await getTranslations('home.demo');
  return (
    <figure className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div className="relative lg:h-[32.5rem]">
        <span
          aria-hidden="true"
          className="absolute -end-10 top-0 size-[min(29rem,90vw)] rounded-full bg-brand-200 max-lg:-top-6"
        />
        <span
          aria-hidden="true"
          className="absolute start-2 bottom-0 size-40 rounded-full bg-sage-300 max-lg:-bottom-6"
        />
        <div className="elev-lg relative flex flex-col gap-3.5 rounded-card bg-surface p-5 lg:absolute lg:start-10 lg:top-17 lg:w-[27.5rem]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold tracking-[0.08em] text-brand-text uppercase">
              {t('lesson')}
            </span>
            <Avatar avatarKey="rocket" size="sm" />
          </div>
          <p className="font-display text-xl">{t('task')}</p>
          <pre
            dir="ltr"
            className="overflow-x-auto rounded-[1.125rem] bg-code-bg px-4 py-3.5 text-start font-mono text-sm leading-7 text-ink"
          >
            <code>
              <span className="text-code-tag">&lt;h1&gt;</span>
              Hello, world!
              <span className="text-code-tag">&lt;/h1&gt;</span>
            </code>
          </pre>
          {/* What the code shows: a white page, like the real preview. */}
          <p
            dir="ltr"
            aria-hidden="true"
            className="rounded-[1.125rem] bg-[#fffaf2] p-4 text-start font-[system-ui,sans-serif] text-[1.625rem] font-bold text-[#1d1d27]"
          >
            Hello, world!
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sage-100 px-3 py-1.5 text-[0.8rem] font-bold text-sage-800">
              <CheckIcon className="size-3.5" />
              {t('passed')}
            </span>
            {/* "+10 XP" keeps its order in Arabic and Urdu. */}
            <span
              dir="ltr"
              className="font-latin rounded-full bg-brand-100 px-3 py-1.5 text-[0.8rem] font-bold text-brand-800"
            >
              {t('xp')}
            </span>
          </div>
        </div>
        <p className="elev-md relative mt-4 ms-auto flex w-fit items-center gap-2.5 rounded-full bg-canvas py-3 ps-3 pe-4.5 text-sm font-bold lg:absolute lg:end-0 lg:bottom-15 lg:mt-0">
          <span className="grid size-8.5 place-items-center rounded-full bg-primary text-on-primary">
            <FlameIcon className="size-4" />
          </span>
          {t('streak')}
        </p>
      </div>
      <figcaption className="sr-only">{t('caption')}</figcaption>
    </figure>
  );
}
