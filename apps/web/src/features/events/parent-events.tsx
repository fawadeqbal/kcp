'use client';

import type { components } from '@kcp/api-client-ts';
import { useFormatter, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Avatar, Button, SectionHeading } from '@/components/ui';
import { api, errorCode } from '@/lib/api';
import { errorMessageKey } from '@/lib/errors';
import { isolate } from '../auth/validation';

type Request = components['schemas']['ParentEventRequestDto'];

/**
 * The children's requests to join a hackathon team, on the dashboard (only when there
 * are some): the event, the team and who is in it, then approve or decline.
 */
export function EventRequestsCard() {
  const t = useTranslations();
  const format = useFormatter();
  const [requests, setRequests] = useState<Request[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    const { data } = await api.GET('/v1/event-requests').catch(() => ({ data: undefined }));
    setRequests(data ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(request: Request, approve: boolean) {
    const key = `${request.teamId}:${request.child.id}`;
    setBusy(key);
    setMessage(null);
    const values = {
      nickname: isolate(request.child.nickname),
      team: isolate(request.team.name),
      event: isolate(request.event.title),
    };
    try {
      const { data, error } = await api.POST('/v1/event-requests/{teamId}/decision', {
        params: { path: { teamId: request.teamId } },
        body: { childId: request.child.id, approve },
      });
      if (data) {
        setMessage({
          tone: 'success',
          text:
            data.status === 'APPROVED'
              ? t('parentEvents.approved', values)
              : t('parentEvents.declined', values),
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
    <section aria-labelledby="event-requests-heading" className="flex flex-col gap-3">
      <SectionHeading id="event-requests-heading">{t('parentEvents.title')}</SectionHeading>
      <p className="text-muted">{t('parentEvents.intro')}</p>
      <div aria-live="polite">
        {message ? (
          <Alert tone={message.tone} live={false}>
            {message.text}
          </Alert>
        ) : null}
      </div>
      <ul className="flex flex-col gap-2.5">
        {requests.map((request) => {
          const key = `${request.teamId}:${request.child.id}`;
          const values = {
            nickname: isolate(request.child.nickname),
            team: isolate(request.team.name),
            event: isolate(request.event.title),
          };
          return (
            <li key={key} className="flex flex-wrap items-center gap-3 rounded-card bg-surface p-4">
              <Avatar avatarKey={request.child.avatarKey} size="sm" />
              <span className="flex min-w-56 flex-1 flex-col gap-0.5">
                <span className="font-semibold">{t('parentEvents.request', values)}</span>
                <span className="text-sm text-muted">
                  {t('parentEvents.when', {
                    start: format.dateTime(new Date(request.event.startsAt), {
                      dateStyle: 'medium',
                    }),
                    end: format.dateTime(new Date(request.event.endsAt), { dateStyle: 'medium' }),
                  })}
                  {' · '}
                  {request.team.members.length
                    ? t('parentEvents.with', {
                        names: request.team.members.map((name) => isolate(name)).join(', '),
                      })
                    : t('parentEvents.newTeam')}
                </span>
              </span>
              <span className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy !== null}
                  onClick={() => void decide(request, false)}
                >
                  {t('parentEvents.decline')}
                </Button>
                <Button
                  size="sm"
                  loading={busy === key}
                  disabled={busy !== null}
                  onClick={() => void decide(request, true)}
                >
                  {t('parentEvents.approve')}
                </Button>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
