'use client';

import type { components } from '@kcp/api-client-ts';
import type { CodeFiles } from '@kcp/checks';
import { useFormatter, useTranslations } from 'next-intl';
import { ProjectPreview } from './project-preview';

export type PortfolioItem = components['schemas']['PortfolioItemDto'];

/** Shipped projects as cards, each running in a preview. */
export function PortfolioItems({
  items,
  headingLevel = 2,
}: {
  items: PortfolioItem[];
  headingLevel?: 2 | 3 | 4;
}) {
  const t = useTranslations('portfolio');
  const format = useFormatter();
  const Heading = `h${headingLevel}` as const;
  return (
    <ul className="grid gap-6 md:grid-cols-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4"
        >
          <div>
            <Heading className="text-lg font-bold">{item.title}</Heading>
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
