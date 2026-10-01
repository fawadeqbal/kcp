'use client';

import type { components } from '@kcp/api-client-ts';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Alert, Avatar, Card, PageSpinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useAccount } from '@/lib/use-account';

type Report = components['schemas']['ParentReportDto'];
type ReportChild = components['schemas']['ReportChildDto'];

const asDate = (day: string) => new Date(`${day}T00:00:00Z`);
const dayBefore = (day: string) => new Date(asDate(day).getTime() - 86_400_000);

/** The parent's weekly reports: each child's week, newest first. */
export function ReportsPage() {
  const t = useTranslations('reports');
  const format = useFormatter();
  const locale = useLocale();
  const user = useAccount('PARENT');
  const [reports, setReports] = useState<Report[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    api
      .GET('/v1/reports', { params: { query: { lang: locale } } })
      .then(({ data }) => (data ? setReports(data.reports) : setFailed(true)))
      .catch(() => setFailed(true));
  }, [user, locale]);

  if (!user || (!reports && !failed)) return <PageSpinner />;
  const date = (value: Date) => format.dateTime(value, { dateStyle: 'medium', timeZone: 'UTC' });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header>
        <h1 className="text-4xl">{t('title')}</h1>
        <p className="mt-1.5 text-lg text-muted">{t('subtitle')}</p>
      </header>
      {failed ? <Alert tone="error">{t('none')}</Alert> : null}
      {reports?.length === 0 ? (
        <p className="rounded-card border-2 border-dashed border-line px-6 py-10 text-center text-muted">
          {t('none')}
        </p>
      ) : null}
      {reports?.map((report) => (
        <section
          key={report.weekKey}
          aria-labelledby={`week-${report.weekKey}`}
          className="flex flex-col gap-3"
        >
          <h2 id={`week-${report.weekKey}`} className="text-2xl">
            {t('week', {
              from: date(asDate(report.startDay)),
              to: date(dayBefore(report.endDay)),
            })}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {report.children.map((child) => (
              <ChildWeekCard key={child.childId} child={child} skillNames={report.skillNames} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ChildWeekCard({
  child,
  skillNames,
}: {
  child: ReportChild;
  skillNames: Record<string, string>;
}) {
  const t = useTranslations('reports');
  const tl = useTranslations('league');
  const format = useFormatter();
  const most = Math.max(10, ...child.days);
  const weekday = (index: number) =>
    // 5 January 2026 was a Monday.
    format.dateTime(new Date(Date.UTC(2026, 0, 5 + index)), { weekday: 'short', timeZone: 'UTC' });
  const stats = [
    t('minutes', { minutes: String(child.minutes) }),
    t('xp', { xp: String(child.xp) }),
    t('lessons', { count: child.lessons }),
    t('projects', { count: child.projects }),
    t('badges', { count: child.badges }),
    t('streak', { days: String(child.streak) }),
    t('league', { tier: tl(`tiers.${child.league}` as 'tiers.bronze') }),
  ];
  return (
    <Card>
      <div className="flex items-center gap-3">
        <Avatar avatarKey={child.avatarKey} size="md" />
        <h3 className="text-xl">
          <bdi>{child.nickname}</bdi>
        </h3>
      </div>
      <ul className="mt-3 flex flex-wrap gap-2">
        {stats.map((stat) => (
          <li key={stat} className="rounded-full bg-raised px-3 py-1 text-sm font-semibold">
            {stat}
          </li>
        ))}
      </ul>
      <figure className="mt-4">
        <figcaption className="text-sm text-muted">{t('dayChart')}</figcaption>
        <ol className="mt-2 flex h-24 items-end gap-2">
          {child.days.map((minutes, index) => (
            <li key={index} className="flex flex-1 flex-col items-center gap-1">
              <span
                aria-hidden="true"
                className="w-full rounded-t-md bg-brand-400"
                style={{ height: `${Math.max(2, Math.round((minutes / most) * 64))}px` }}
              />
              <span className="text-xs text-muted">
                {weekday(index)}
                <span className="sr-only">: {minutes}</span>
              </span>
            </li>
          ))}
        </ol>
      </figure>
      <h4 className="mt-4 text-sm font-bold">{t('newSkills')}</h4>
      {child.skills.length ? (
        <ul className="mt-1.5 flex flex-wrap gap-2">
          {child.skills.map((key) => (
            <li
              key={key}
              className="rounded-full bg-sage-100 px-3 py-1 text-sm font-semibold text-sage-800"
            >
              {skillNames[key] ?? key}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-muted">{t('noNewSkills')}</p>
      )}
    </Card>
  );
}
