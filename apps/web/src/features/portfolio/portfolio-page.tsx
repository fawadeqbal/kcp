'use client';

import type { components } from '@kcp/api-client-ts';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Alert, EmptyState, PageSpinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useAccount } from '@/lib/use-account';
import { CertificatesSection } from '../certificates/certificates-section';
import { HubWork } from './hub-work';
import { PortfolioItems } from './portfolio-items';

type Portfolio = components['schemas']['PortfolioDto'];

/** The student's own portfolio: everything they've shipped. */
export function PortfolioPage() {
  const t = useTranslations('portfolio');
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
    <div className="mx-auto flex max-w-300 flex-col gap-7">
      <header>
        <h1 className="text-4xl">{t('title')}</h1>
        <p className="mt-1.5 text-lg text-muted">{t('subtitle')}</p>
      </header>
      {failed ? <Alert tone="error">{t('loadFailed')}</Alert> : null}
      {!failed && !portfolio ? <PageSpinner /> : null}
      {portfolio && portfolio.items.length === 0 && portfolio.hubWork.length === 0 ? (
        <EmptyState icon="rocket" title={t('empty')} />
      ) : null}
      {portfolio && portfolio.items.length > 0 ? <PortfolioItems items={portfolio.items} /> : null}
      {portfolio ? <HubWork items={portfolio.hubWork} /> : null}
      <CertificatesSection />
    </div>
  );
}
