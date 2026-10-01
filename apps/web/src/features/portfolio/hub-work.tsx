'use client';

import type { components } from '@kcp/api-client-ts';
import { clsx } from 'clsx';
import { useFormatter, useTranslations } from 'next-intl';
import { Badge } from '@/components/ui';
import { isolate } from '../auth/validation';

type HubWorkItem = components['schemas']['HubPortfolioItemDto'];

/**
 * Real client projects the student worked on (hub, 15+), once the client accepted the
 * work and allowed portfolios: the project, the student's own tasks and the skills.
 * Never the client's name, the money or the code (the client's). Nothing when empty.
 */
export function HubWork({
  items,
  headingLevel = 2,
  compact = false,
}: {
  items: HubWorkItem[];
  headingLevel?: 2 | 4 | 5;
  compact?: boolean;
}) {
  const t = useTranslations('portfolio');
  const format = useFormatter();
  if (items.length === 0) return null;
  const Heading = `h${headingLevel}` as const;
  const ItemHeading = `h${headingLevel + 1}` as 'h3' | 'h5' | 'h6';
  return (
    <section className="flex flex-col gap-3">
      <Heading className={compact ? 'font-sans text-sm font-bold' : 'text-2xl'}>
        {t('hubTitle')}
      </Heading>
      {compact ? null : <p className="text-muted">{t('hubIntro')}</p>}
      <ul className={clsx('grid gap-4', !compact && 'md:grid-cols-2')}>
        {items.map((item) => (
          <li
            key={item.projectId}
            className={clsx(
              'flex flex-col gap-2',
              compact ? 'rounded-row bg-canvas p-3.5' : 'rounded-card bg-surface p-5',
            )}
          >
            <ItemHeading className={compact ? 'text-lg' : 'text-xl'}>
              {isolate(item.title)}
            </ItemHeading>
            {item.finishedAt ? (
              <p className="text-sm text-muted">
                {t('hubFinished', {
                  date: format.dateTime(new Date(item.finishedAt), { dateStyle: 'medium' }),
                })}
              </p>
            ) : null}
            <p className="text-sm">
              <span className="font-semibold">{t('hubTasks')}</span>{' '}
              {item.tasks.map((task) => isolate(task)).join(' · ')}
            </p>
            {item.skills.length ? (
              <p className="flex flex-wrap gap-1.5" dir="ltr">
                {item.skills.map((skill) => (
                  <Badge key={skill}>{skill}</Badge>
                ))}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
