'use client';

import type { components } from '@kcp/api-client-ts';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Alert, PageSpinner } from '@/components/ui';
import { api } from '@/lib/api';
import { isolate } from '../auth/validation';

type Verified = components['schemas']['VerifiedCertificateDto'];

const titleIn = (titles: Record<string, string>, locale: string) =>
  titles[locale] ?? titles['en'] ?? '';

/** Anyone can check a certificate with the code (or QR code) printed on it. */
export function CertificateVerify({ code }: { code: string }) {
  const t = useTranslations('certificates');
  const locale = useLocale();
  const format = useFormatter();
  const [result, setResult] = useState<Verified | 'notFound' | 'failed' | null>(null);

  useEffect(() => {
    api
      .GET('/v1/public/certificates/{code}', { params: { path: { code } } })
      .then(({ data, response }) =>
        setResult(data ?? (response.status === 404 ? 'notFound' : 'failed')),
      )
      .catch(() => setResult('failed'));
  }, [code]);

  if (!result) return <PageSpinner />;
  if (result === 'notFound') return <Alert tone="error">{t('verifyNotFound', { code })}</Alert>;
  if (result === 'failed') return <Alert tone="error">{t('verifyFailed')}</Alert>;
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-8 text-center">
      <span aria-hidden="true" className="text-5xl">
        {result.valid ? '✅' : '⚠️'}
      </span>
      <h1 className="text-2xl font-bold">{result.valid ? t('verifyValid') : t('verifyRevoked')}</h1>
      <p className="text-lg">
        {t('verifyBody', {
          nickname: isolate(result.nickname),
          module: titleIn(result.moduleTitles, locale),
          track: titleIn(result.trackTitles, locale),
          date: format.dateTime(new Date(result.issuedAt), { dateStyle: 'long' }),
        })}
      </p>
      <p className="font-latin text-muted">
        <bdi>{result.code}</bdi>
      </p>
      <p className="text-sm text-muted">{t('verifyPrivacy')}</p>
    </div>
  );
}
