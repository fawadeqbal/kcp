'use client';

import type { components } from '@kcp/api-client-ts';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Alert, IconBubble, PageSpinner } from '@/components/ui';
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
    <div className="relative mx-auto flex w-full max-w-2xl flex-col items-center gap-4 overflow-hidden rounded-hero bg-surface px-6 py-10 text-center sm:px-10">
      <span
        aria-hidden="true"
        className="absolute -end-12 -top-14 size-40 rounded-full bg-brand-200"
      />
      <span
        aria-hidden="true"
        className="absolute -start-10 -bottom-12 size-32 rounded-full bg-sage-200"
      />
      <IconBubble
        icon={result.valid ? 'award' : 'alert'}
        tone={result.valid ? 'sageSolid' : 'brand'}
        size="lg"
        className="relative"
      />
      <h1 className="relative text-4xl">{result.valid ? t('verifyValid') : t('verifyRevoked')}</h1>
      <p className="relative text-lg">
        {t('verifyBody', {
          nickname: isolate(result.nickname),
          module: titleIn(result.moduleTitles, locale),
          track: titleIn(result.trackTitles, locale),
          date: format.dateTime(new Date(result.issuedAt), { dateStyle: 'long' }),
        })}
      </p>
      <p className="relative rounded-full bg-raised px-4 py-1.5 font-mono text-sm font-semibold">
        <bdi>{result.code}</bdi>
      </p>
      <p className="relative text-sm text-muted">{t('verifyPrivacy')}</p>
    </div>
  );
}
