import { Badge } from '@kcp/ui';
import { clsx } from 'clsx';
import { getTranslations } from 'next-intl/server';
import { CodeIcon, GlobeIcon, StarIcon } from '@/components/icons';
import { IconBadge } from '@/components/layout';

export const TRACKS = ['builder', 'explorer', 'pro'] as const;
export type Track = (typeof TRACKS)[number];

const ICONS = { builder: CodeIcon, explorer: StarIcon, pro: GlobeIcon } as const;

/** The three tracks side by side: Builder is open now, the others come later. */
export async function TrackCards({ headingLevel = 3 }: { headingLevel?: 2 | 3 }) {
  const t = await getTranslations('tracks');
  const common = await getTranslations('common');
  const Heading = headingLevel === 2 ? 'h2' : 'h3';

  return (
    <ul className="grid gap-5 md:grid-cols-3">
      {TRACKS.map((track) => {
        const open = track === 'builder';
        const Icon = ICONS[track];
        return (
          <li
            key={track}
            className={clsx(
              'flex flex-col gap-4 rounded-[var(--radius-card)] border bg-surface p-6',
              open ? 'border-brand-500 shadow-lg shadow-brand-600/10' : 'border-line',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <IconBadge tone={open ? 'brand' : 'accent'}>
                <Icon />
              </IconBadge>
              <Badge tone={open ? 'success' : 'neutral'}>
                {open ? common('availableNow') : common('comingLater')}
              </Badge>
            </div>
            <div>
              <Heading className="text-xl font-bold">{t(`${track}.name`)}</Heading>
              <p className="mt-1 text-sm font-semibold text-brand-700">{t(`${track}.ages`)}</p>
            </div>
            <p className="text-muted">{t(`${track}.summary`)}</p>
          </li>
        );
      })}
    </ul>
  );
}
