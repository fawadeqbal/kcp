import { clsx } from 'clsx';
import { getTranslations } from 'next-intl/server';
import {
  BanIcon,
  BoxIcon,
  LockIcon,
  MaskIcon,
  NoChatIcon,
  ShieldIcon,
  TrophyIcon,
} from '@/components/icons';
import { IconBadge } from '@/components/layout';

/** Our promises to parents, in the order the safety page lists them. */
export const PROMISES = {
  parents: ShieldIcon,
  anonymous: MaskIcon,
  noChat: NoChatIcon,
  boards: TrophyIcon,
  sandbox: BoxIcon,
  data: LockIcon,
  noAds: BanIcon,
} as const;

export type SafetyPromise = keyof typeof PROMISES;

export async function SafetyPromises({
  only,
  headingLevel = 3,
  narrow = false,
}: {
  /** A few promises (the home page shows four); all of them by default. */
  only?: readonly SafetyPromise[];
  headingLevel?: 2 | 3;
  /** In a half-width column: at most two cards side by side. */
  narrow?: boolean;
}) {
  const t = await getTranslations('safety');
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const keys = only ?? (Object.keys(PROMISES) as SafetyPromise[]);
  // With all seven, the first ("Parents are in charge") takes two columns: two even rows.
  const featureFirst = keys.length === 7;

  return (
    <ul className={clsx('grid gap-5 sm:grid-cols-2', !narrow && 'lg:grid-cols-4')}>
      {keys.map((key, index) => {
        const Icon = PROMISES[key];
        const featured = featureFirst && index === 0;
        return (
          <li
            key={key}
            className={clsx(
              'flex flex-col gap-3 rounded-[var(--radius-card)] border bg-surface p-6',
              featured ? 'border-brand-500 sm:col-span-2' : 'border-line',
            )}
          >
            <IconBadge>
              <Icon />
            </IconBadge>
            <Heading className="text-lg font-bold">{t(`${key}Title`)}</Heading>
            <p className="text-muted">{t(key)}</p>
          </li>
        );
      })}
    </ul>
  );
}
