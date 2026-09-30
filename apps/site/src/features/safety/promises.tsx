import { clsx } from 'clsx';
import { getTranslations } from 'next-intl/server';
import {
  BanIcon,
  LockIcon,
  MaskIcon,
  NoChatIcon,
  ShieldIcon,
  TrophyIcon,
  UsersIcon,
} from '@/components/icons';
import { IconBadge } from '@/components/layout';

/** Our promises to parents, in the order the safety page lists them. */
export const PROMISES = {
  parents: UsersIcon,
  anonymous: MaskIcon,
  noChat: NoChatIcon,
  boards: TrophyIcon,
  sandbox: ShieldIcon,
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
    <ul className={clsx('grid gap-4 sm:grid-cols-2', !narrow && 'lg:grid-cols-4')}>
      {keys.map((key, index) => {
        const Icon = PROMISES[key];
        const featured = featureFirst && index === 0;
        return (
          <li
            key={key}
            className={clsx(
              'flex flex-col gap-3 rounded-hero p-7',
              featured ? 'bg-sage-100 sm:col-span-2' : 'bg-surface',
            )}
          >
            <IconBadge tone={featured ? 'sageSolid' : 'sage'} size="lg">
              <Icon />
            </IconBadge>
            <Heading className="text-xl">{t(`${key}Title`)}</Heading>
            <p className={featured ? 'text-sage-800' : 'text-muted'}>{t(key)}</p>
          </li>
        );
      })}
    </ul>
  );
}

const HOME_PROMISES = ['parents', 'anonymous', 'noChat', 'sandbox'] as const;

/** The home page's four promises, in a few words each, on its sage band. */
export async function HomePromises() {
  const t = await getTranslations('home.promises');
  return (
    <ul className="grid gap-3.5 sm:grid-cols-2">
      {HOME_PROMISES.map((key) => {
        const Icon = PROMISES[key];
        return (
          <li key={key} className="flex gap-3.5 rounded-panel bg-canvas p-5.5">
            <IconBadge tone="sageSolid">
              <Icon />
            </IconBadge>
            <div>
              <h3 className="font-sans text-base font-bold">{t(`${key}Title`)}</h3>
              <p className="mt-0.5 text-sm text-muted">{t(key)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
