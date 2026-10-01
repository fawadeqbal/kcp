'use client';

import type { components } from '@kcp/api-client-ts';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Avatar, Button, SectionHeading } from '@/components/ui';
import { api, errorCode } from '@/lib/api';
import { errorMessageKey } from '@/lib/errors';
import { isolate } from '../auth/validation';

type Request = components['schemas']['ParentClassRequestDto'];

/**
 * The children's requests to join a teacher's class, on the dashboard (only when there
 * are some): the class, the school and the teacher, then approve or decline.
 */
export function ClassRequestsCard() {
  const t = useTranslations();
  const [requests, setRequests] = useState<Request[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    const { data } = await api.GET('/v1/class-requests').catch(() => ({ data: undefined }));
    setRequests(data ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(request: Request, approve: boolean) {
    const key = `${request.classId}:${request.child.id}`;
    setBusy(key);
    setMessage(null);
    const values = {
      nickname: isolate(request.child.nickname),
      className: isolate(request.className),
    };
    try {
      const { data, error } = await api.POST('/v1/class-requests/{classId}/decision', {
        params: { path: { classId: request.classId } },
        body: { childId: request.child.id, approve },
      });
      if (data) {
        setMessage({
          tone: 'success',
          text:
            data.status === 'APPROVED'
              ? t('parentClasses.approved', values)
              : t('parentClasses.declined', values),
        });
        await load();
      } else {
        setMessage({ tone: 'error', text: t(`errors.${errorMessageKey(errorCode(error))}`) });
      }
    } catch {
      setMessage({ tone: 'error', text: t('errors.network') });
    } finally {
      setBusy(null);
    }
  }

  if (!requests || (requests.length === 0 && !message)) return null;
  return (
    <section aria-labelledby="class-requests-heading" className="flex flex-col gap-3">
      <SectionHeading id="class-requests-heading">{t('parentClasses.title')}</SectionHeading>
      <p className="text-muted">{t('parentClasses.intro')}</p>
      <div aria-live="polite">
        {message ? (
          <Alert tone={message.tone} live={false}>
            {message.text}
          </Alert>
        ) : null}
      </div>
      <ul className="flex flex-col gap-2.5">
        {requests.map((request) => {
          const key = `${request.classId}:${request.child.id}`;
          return (
            <li key={key} className="flex flex-wrap items-center gap-3 rounded-card bg-surface p-4">
              <Avatar avatarKey={request.child.avatarKey} size="sm" />
              <span className="flex min-w-56 flex-1 flex-col gap-0.5">
                <span className="font-semibold">
                  {t('parentClasses.request', {
                    nickname: isolate(request.child.nickname),
                    className: isolate(request.className),
                    school: isolate(request.school),
                  })}
                </span>
                <span className="text-sm text-muted">
                  {t('parentClasses.teacher', { teacher: isolate(request.teacher) })}
                </span>
              </span>
              <span className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy !== null}
                  onClick={() => void decide(request, false)}
                >
                  {t('parentClasses.decline')}
                </Button>
                <Button
                  size="sm"
                  loading={busy === key}
                  disabled={busy !== null}
                  onClick={() => void decide(request, true)}
                >
                  {t('parentClasses.approve')}
                </Button>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
