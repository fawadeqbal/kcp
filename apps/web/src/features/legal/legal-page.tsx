import { TERMS_VERSION } from '@kcp/shared';
import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { LEGAL_UPDATED, type LegalDoc, legalTexts } from '@/content/legal';
import { Alert } from '@/components/ui';
import { routing } from '@/i18n/routing';
import { Markdown } from '../learn/markdown';

type Params = { params: Promise<{ locale: string }> };

const TITLES = {
  safety: 'safetyTitle',
  terms: 'termsTitle',
  privacy: 'privacyTitle',
} as const satisfies Record<LegalDoc, string>;

/** The safety page, terms of use or privacy policy: public, static, in every language. */
export function legalPage(doc: LegalDoc) {
  async function generateMetadata({ params }: Params): Promise<Metadata> {
    const { locale } = await params;
    if (!hasLocale(routing.locales, locale)) return {};
    const t = await getTranslations({ locale, namespace: 'legal' });
    return { title: t(TITLES[doc]) };
  }

  // oxlint-disable-next-line unicorn/consistent-function-scoping -- uses doc
  async function Page({ params }: Params) {
    const { locale } = await params;
    if (!hasLocale(routing.locales, locale)) notFound();
    setRequestLocale(locale);
    const t = await getTranslations('legal');
    const format = await getFormatter();
    const updated = format.dateTime(new Date(`${LEGAL_UPDATED[doc]}T00:00:00Z`), {
      dateStyle: 'long',
      timeZone: 'UTC',
    });
    return (
      <article className="mx-auto flex max-w-3xl flex-col gap-4">
        <h1 className="text-4xl">{t(TITLES[doc])}</h1>
        <p className="text-sm text-muted">
          {doc === 'safety' ? null : `${t('version', { version: TERMS_VERSION })} · `}
          {t('lastUpdated', { date: updated })}
        </p>
        {doc === 'safety' ? null : (
          <Alert tone="warning" live={false}>
            <p className="text-sm">{t('draft')}</p>
          </Alert>
        )}
        <Markdown sections="h2">{legalTexts[doc][locale]}</Markdown>
      </article>
    );
  }

  return { Page, generateMetadata };
}
