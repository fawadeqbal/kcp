'use client';

import type { components } from '@kcp/api-client-ts';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Badge, Button } from '@/components/ui';
import { api } from '@/lib/api';
import { downloadCertificate } from './download';

type Certificate = components['schemas']['CertificateDto'];

/** A child's certificates on the parent's dashboard, to download and print. */
export function ChildCertificates({ childId }: { childId: string }) {
  const t = useTranslations('certificates');
  const locale = useLocale();
  const format = useFormatter();
  const [certificates, setCertificates] = useState<Certificate[] | null>(null);

  useEffect(() => {
    api
      .GET('/v1/children/{id}/certificates', {
        params: { path: { id: childId }, query: { lang: locale } },
      })
      .then(({ data }) => setCertificates(data?.certificates ?? []))
      .catch(() => setCertificates([]));
  }, [childId, locale]);

  if (!certificates?.length) return null;
  return (
    <div className="flex flex-col gap-2">
      <h4 className="font-semibold">{t('title')}</h4>
      <ul className="flex flex-col gap-2">
        {certificates.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-3 text-sm">
            <span aria-hidden="true">🎓</span>
            <span className="flex-1">
              <strong>{c.moduleTitle}</strong> ·{' '}
              {format.dateTime(new Date(c.issuedAt), { dateStyle: 'medium' })}
            </span>
            {c.revoked ? (
              <Badge tone="danger">{t('revoked')}</Badge>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void downloadCertificate(c.id, c.code)}
              >
                {t('download')}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
