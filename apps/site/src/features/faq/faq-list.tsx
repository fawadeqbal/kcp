import { clsx } from 'clsx';
import { getTranslations } from 'next-intl/server';
import { ChevronIcon } from '@/components/icons';
import type { Pricing } from '@/lib/pricing';

export const FAQ = [
  'ages',
  'experience',
  'lessons',
  'languages',
  'signUp',
  'safety',
  'devices',
  'price',
  'payment',
  'trial',
] as const;
export type FaqId = (typeof FAQ)[number];

/**
 * Questions and answers as <details>: they open without JavaScript, work with the keyboard
 * and screen readers announce them as expandable.
 */
export async function FaqList({
  ids = FAQ,
  pricing,
  onSurface = false,
}: {
  ids?: readonly FaqId[];
  /** On a sand band: the rows take the page's ground instead. */
  onSurface?: boolean;
  /** The trial length and family discount mentioned in the price answer. */
  pricing: Pick<Pricing, 'trialDays' | 'familyDiscountPercent'>;
}) {
  const t = await getTranslations('faq');
  const answer = (id: FaqId) =>
    id === 'price'
      ? t('priceA', { days: pricing.trialDays, percent: pricing.familyDiscountPercent })
      : t(`${id}A`);

  return (
    <div className="flex flex-col gap-2.5">
      {ids.map((id) => (
        <details
          key={id}
          id={`faq-${id}`}
          className={clsx('group rounded-panel', onSurface ? 'bg-canvas' : 'bg-surface')}
        >
          <summary className="flex min-h-15 cursor-pointer list-none items-center justify-between gap-4 rounded-panel px-5 py-4 text-lg font-bold hover:bg-ink/5 sm:px-6">
            {t(`${id}Q`)}
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-text">
              <ChevronIcon className="size-4 motion-safe:transition-transform group-open:rotate-180" />
            </span>
          </summary>
          <p className="px-5 pb-5 text-muted sm:px-6">{answer(id)}</p>
        </details>
      ))}
    </div>
  );
}
