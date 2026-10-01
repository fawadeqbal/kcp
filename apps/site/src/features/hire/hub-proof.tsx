import type { Locale } from '@kcp/i18n';
import { getFormatter, getTranslations } from 'next-intl/server';
import { Section } from '@/components/layout';
import { COUNTRY_NAMES, isCountryCode } from '@/lib/countries';
import { getHubStats, getHubStories } from './api';

const digitsOf = (currency: string) =>
  ['JPY', 'KRW', 'VND', 'CLP', 'UGX', 'XAF', 'XOF'].includes(currency) ? 0 : 2;

/**
 * The hub in numbers, and stories parents agreed to share, as a band of the page. Nothing
 * at all (not even the heading) while there's nothing to show.
 */
export async function HubProof({ locale, title }: { locale: Locale; title: string }) {
  const t = await getTranslations('hire.proof');
  const format = await getFormatter();
  const [stats, stories] = await Promise.all([getHubStats(), getHubStories(locale)]);
  const earned = stats?.earned[0];
  const showStats = stats && (stats.projectsCompleted > 0 || stats.studentsEarning > 0);
  if (!showStats && stories.length === 0) return null;
  return (
    <Section id="proof" title={title}>
      <div className="flex flex-col gap-8">
        {showStats ? (
          <dl className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-card bg-surface p-6">
              <dt className="text-muted">{t('projects')}</dt>
              <dd className="font-display text-4xl">{format.number(stats.projectsCompleted)}</dd>
            </div>
            <div className="rounded-card bg-surface p-6">
              <dt className="text-muted">{t('students')}</dt>
              <dd className="font-display text-4xl">{format.number(stats.studentsEarning)}</dd>
            </div>
            {earned ? (
              <div className="rounded-card bg-surface p-6">
                <dt className="text-muted">{t('earned')}</dt>
                <dd className="font-display text-4xl">
                  {format.number(earned.amountMinor / 10 ** digitsOf(earned.currency), {
                    style: 'currency',
                    currency: earned.currency,
                    maximumFractionDigits: 0,
                  })}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}
        {stories.length ? (
          <ul className="grid gap-4 md:grid-cols-2">
            {stories.map((story) => (
              <li key={story.id} className="rounded-card bg-surface p-6">
                <p className="font-display text-xl">{story.headline}</p>
                <p className="mt-2 text-muted">{story.body}</p>
                <p className="mt-3 text-sm font-semibold">
                  {story.firstName}
                  {story.countryCode && isCountryCode(story.countryCode)
                    ? `, ${COUNTRY_NAMES[story.countryCode][locale]}`
                    : ''}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="text-sm text-muted">{t('note')}</p>
      </div>
    </Section>
  );
}
