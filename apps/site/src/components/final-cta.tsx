import type { Locale } from '@kcp/i18n';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { SignUpLink } from './links';

/** The closing band of a page: a terracotta panel with sign up now, or the waitlist. */
export async function FinalCallToAction({
  title,
  body,
  locale,
}: {
  title: string;
  body: string;
  locale: Locale;
}) {
  const t = await getTranslations('cta');
  return (
    <section aria-labelledby="final-title" className="px-2 pb-2 sm:px-4 sm:pb-4">
      <div className="relative mx-auto max-w-[80rem] overflow-hidden rounded-[2.5rem] bg-primary text-on-primary sm:rounded-[3rem]">
        <span
          aria-hidden="true"
          className="absolute -end-20 -top-30 size-85 rounded-full bg-primary-hover"
        />
        <div className="relative flex flex-col items-start gap-6 px-6 py-12 sm:px-14 sm:py-14 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <h2 id="final-title" className="text-4xl text-balance sm:text-[2.625rem]">
              {title}
            </h2>
            <p className="mt-2 text-lg">{body}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3">
            <SignUpLink locale={locale} variant="onBrand" size="lg" />
            <Link
              href="/waitlist"
              className="font-bold underline decoration-2 underline-offset-4 hover:decoration-4"
            >
              {t('waitlist')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
