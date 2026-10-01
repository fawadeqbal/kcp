'use client';

import type { components } from '@kcp/api-client-ts';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Alert, PageSpinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useAccount } from '@/lib/use-account';
import { SkillMapView } from './skill-map';

type SkillMap = components['schemas']['SkillMapDto'];

/** The student's skill map: what the lessons they finished taught them. */
export function SkillsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const user = useAccount('STUDENT');
  const [map, setMap] = useState<SkillMap | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    api
      .GET('/v1/skills', { params: { query: { lang: locale } } })
      .then(({ data }) => (data ? setMap(data) : setFailed(true)))
      .catch(() => setFailed(true));
  }, [user, locale]);

  if (!user || (!map && !failed)) return <PageSpinner />;
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-4xl">{t('skills.title')}</h1>
        <p className="mt-1.5 text-lg text-muted">{t('skills.subtitle')}</p>
      </header>
      {map ? <SkillMapView map={map} /> : <Alert tone="error">{t('errors.generic')}</Alert>}
    </div>
  );
}

/** A child's skill map, for their parent (in the child's settings). */
export function ChildSkillsSection({ childId, nickname }: { childId: string; nickname: string }) {
  const t = useTranslations('skills');
  const locale = useLocale();
  const [map, setMap] = useState<SkillMap | null>(null);

  useEffect(() => {
    api
      .GET('/v1/children/{id}/skills', {
        params: { path: { id: childId }, query: { lang: locale } },
      })
      .then(({ data }) => setMap(data ?? null))
      .catch(() => undefined);
  }, [childId, locale]);

  if (!map) return null;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted">{t('childSubtitle', { nickname })}</p>
      <SkillMapView map={map} headingLevel={3} />
    </div>
  );
}
