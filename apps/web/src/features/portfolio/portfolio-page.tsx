'use client';

import type { components } from '@kcp/api-client-ts';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Alert, EmptyState, PageSpinner } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { useAccount } from '@/lib/use-account';
import { CertificatesSection } from '../certificates/certificates-section';
import { PortfolioItems } from './portfolio-items';

type Portfolio = components['schemas']['PortfolioDto'];

/** The student's own portfolio: everything they've shipped. */
export function PortfolioPage() {
  const t = useTranslations('portfolio');
  const tl = useTranslations('lesson');
  const locale = useLocale();
  const user = useAccount('STUDENT');
  const signedIn = user !== null;
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    api
      .GET('/v1/portfolio', { params: { query: { lang: locale } } })
      .then(({ data }) => {
        if (cancelled) return;
        if (data) setPortfolio(data);
        else setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn, locale]);

  if (!user) return <PageSpinner />;
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <nav aria-label={tl('backToLearning')} className="text-sm">
        <Link href="/learn" className="font-semibold text-brand-700 underline underline-offset-4">
          {tl('backToLearning')}
        </Link>
      </nav>
      <header>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="mt-1 text-muted">{t('subtitle')}</p>
      </header>
      {failed ? <Alert tone="error">{t('loadFailed')}</Alert> : null}
      {!failed && !portfolio ? <PageSpinner /> : null}
      {portfolio && portfolio.items.length === 0 ? <EmptyState title={t('empty')} /> : null}
      {portfolio && portfolio.items.length > 0 ? <PortfolioItems items={portfolio.items} /> : null}
      <CertificatesSection />
    </div>
  );
}
