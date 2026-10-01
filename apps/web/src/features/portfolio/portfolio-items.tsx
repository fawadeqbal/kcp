'use client';

import type { components } from '@kcp/api-client-ts';
import type { CodeFiles, StageLevel } from '@kcp/checks';
import { clsx } from 'clsx';
import { useFormatter, useTranslations } from 'next-intl';
import { Badge } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { REVIEW_TONE } from '../reviews/review-result';
import { ProjectPreview } from './project-preview';

export type PortfolioItem = components['schemas']['PortfolioItemDto'];

/** Shipped projects as cards, each running in a preview that can fill the screen. */
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
          <ProjectPreview
            files={item.files as CodeFiles}
            stage={item.stage as StageLevel | null}
            title={t('previewTitle', { title: item.title })}
            header={
              <>
                <Heading className={compact ? 'text-lg' : 'text-xl'}>{item.title}</Heading>
                <p className="text-sm text-muted">
                  {item.moduleTitle} · {t('version', { version: String(item.version) })} ·{' '}
                  {t('shippedOn', {
                    date: format.dateTime(new Date(item.publishedAt), { dateStyle: 'medium' }),
                  })}
                </p>
                {item.review ? <ReviewLine review={item.review} /> : null}
              </>
            }
          />
        </li>
      ))}
    </ul>
  );
}

function ReviewLine({ review }: { review: NonNullable<PortfolioItem['review']> }) {
  const t = useTranslations('review');
  const decided = review.status === 'APPROVED' || review.status === 'CHANGES_REQUESTED';
  return (
    <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
      <Badge tone={REVIEW_TONE[review.status]}>{t(`status.${review.status}`)}</Badge>
      {decided ? (
        <Link
          href={`/reviews/${review.id}`}
          className="font-bold text-brand-text underline-offset-4 hover:underline"
        >
          {t('openParent')}
        </Link>
      ) : null}
    </p>
  );
}
