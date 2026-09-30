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
}: {
  ids?: readonly FaqId[];
  /** The trial length and family discount mentioned in the price answer. */
  pricing: Pick<Pricing, 'trialDays' | 'familyDiscountPercent'>;
}) {
  const t = await getTranslations('faq');
  const answer = (id: FaqId) =>
    id === 'price'
      ? t('priceA', { days: pricing.trialDays, percent: pricing.familyDiscountPercent })
      : t(`${id}A`);

  return (
    <div className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
      {ids.map((id) => (
        <details key={id} id={`faq-${id}`} className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-lg font-semibold hover:bg-brand-50 sm:px-6">
            {t(`${id}Q`)}
            <ChevronIcon className="text-brand-600 motion-safe:transition-transform group-open:rotate-180" />
          </summary>
          <p className="px-5 pb-5 text-muted sm:px-6">{answer(id)}</p>
        </details>
      ))}
    </div>
  );
}
