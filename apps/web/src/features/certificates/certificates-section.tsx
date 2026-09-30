'use client';

import type { components } from '@kcp/api-client-ts';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Card } from '@/components/ui';
import { refreshNotifications } from '@/components/notification-bell';
import { api, errorCode } from '@/lib/api';
import { isolate } from '../auth/validation';
import { downloadCertificate } from './download';

type CertificateList = components['schemas']['CertificateListDto'];
type Certificate = components['schemas']['CertificateDto'];

/** The student's certificates: one per finished module (premium), as a PDF. */
export function CertificatesSection() {
  const t = useTranslations('certificates');
  const locale = useLocale();
  const format = useFormatter();
  const [list, setList] = useState<CertificateList | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await api
      .GET('/v1/certificates', { params: { query: { lang: locale } } })
      .catch(() => ({ data: undefined }));
    if (data) setList(data);
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  async function download(certificate: Certificate) {
    setBusy(certificate.id);
    setError(null);
    if (!(await downloadCertificate(certificate.id, certificate.code)))
      setError(t('downloadFailed'));
    setBusy(null);
  }

  async function issue(moduleId: string) {
    setBusy(moduleId);
    setError(null);
    try {
      const { data, error: apiError } = await api.POST('/v1/certificates', {
        params: { query: { lang: locale } },
        body: { moduleId },
      });
      if (!data) {
        setError(errorCode(apiError) === 'PREMIUM_REQUIRED' ? t('premiumOnly') : t('issueFailed'));
        return;
      }
      refreshNotifications();
      await load();
      await downloadCertificate(data.id, data.code);
    } catch {
      setError(t('issueFailed'));
    } finally {
      setBusy(null);
    }
  }

  if (!list) return null;
  return (
    <Card title={t('title')}>
      <div className="flex flex-col gap-3">
        <p className="text-muted">{t('intro')}</p>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <ul className="flex flex-col gap-2">
          {list.modules.map((module) => (
            <li
              key={module.moduleId}
              className="flex flex-wrap items-center gap-3 rounded-row bg-raised p-3"
            >
              <span aria-hidden="true" className="text-2xl">
                {module.certificate ? '🎓' : module.finished ? '🏁' : '📜'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{module.moduleTitle}</span>
                <span className="block text-sm text-muted">
                  {module.certificate
                    ? t('issuedOn', {
                        date: format.dateTime(new Date(module.certificate.issuedAt), {
                          dateStyle: 'long',
                        }),
                        code: isolate(module.certificate.code),
                      })
                    : module.finished
                      ? list.premium
                        ? t('ready')
                        : t('premiumOnly')
                      : t('notFinished')}
                </span>
              </span>
              {module.certificate ? (
                module.certificate.revoked ? (
                  <Badge tone="danger">{t('revoked')}</Badge>
                ) : (
                  <Button
                    variant="secondary"
                    loading={busy === module.certificate.id}
                    onClick={() => void download(module.certificate!)}
                  >
                    {t('download')}
                  </Button>
                )
              ) : module.finished && list.premium ? (
                <Button
                  loading={busy === module.moduleId}
                  onClick={() => void issue(module.moduleId)}
                >
                  {t('get')}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
