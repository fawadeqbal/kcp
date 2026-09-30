'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { PageSpinner } from '@/components/ui';
import { SANDBOX_URL } from '../learn/use-sandbox';

/** Where shared portfolios live: the user-content domain, the key after "#". */
export const sharedPortfolioUrl = (locale: string, token: string) =>
  `${SANDBOX_URL}/portfolio/?lang=${locale}#${token}`;

/**
 * Links shared before portfolios moved to the user-content domain (/p/<token>) keep
 * working: they go on to the new page.
 */
export function SharedPortfolio({ token }: { token: string }) {
  const t = useTranslations('shared');
  const locale = useLocale();
  const url = sharedPortfolioUrl(locale, token);

  useEffect(() => {
    window.location.replace(url);
  }, [url]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4">
      <PageSpinner />
      <a href={url} className="font-semibold text-brand-text underline" rel="noreferrer">
        {t('title')}
      </a>
    </div>
  );
}
