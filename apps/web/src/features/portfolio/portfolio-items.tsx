'use client';

import type { components } from '@kcp/api-client-ts';
import type { CodeFiles } from '@kcp/checks';
import { clsx } from 'clsx';
import { useFormatter, useTranslations } from 'next-intl';
import { ProjectPreview } from './project-preview';

export type PortfolioItem = components['schemas']['PortfolioItemDto'];

/** Shipped projects as cards, each running in a preview. */
export function PortfolioItems({
  items,
  headingLevel = 2,
  compact = false,
}: {
  items: PortfolioItem[];
  headingLevel?: 2 | 3 | 4 | 5;
  /** One column, on a light well (inside a parent's panel). */
  compact?: boolean;
}) {
  const t = useTranslations('portfolio');
  const format = useFormatter();
  const Heading = `h${headingLevel}` as const;
  return (
    <ul className={clsx('grid gap-5', !compact && 'md:grid-cols-2')}>
      {items.map((item) => (
        <li
          key={item.id}
          className={clsx(
            'flex flex-col gap-3.5',
            compact ? 'rounded-row bg-canvas p-3.5' : 'rounded-card bg-surface p-5',
          )}
        >
          <div>
            <Heading className={compact ? 'text-lg' : 'text-xl'}>{item.title}</Heading>
            <p className="text-sm text-muted">
              {item.moduleTitle} · {t('version', { version: String(item.version) })} ·{' '}
              {t('shippedOn', {
                date: format.dateTime(new Date(item.publishedAt), { dateStyle: 'medium' }),
              })}
            </p>
          </div>
          <ProjectPreview
            files={item.files as CodeFiles}
            title={t('previewTitle', { title: item.title })}
          />
        </li>
      ))}
    </ul>
  );
}
