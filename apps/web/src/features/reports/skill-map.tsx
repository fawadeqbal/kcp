'use client';

import type { components } from '@kcp/api-client-ts';
import { clsx } from 'clsx';
import { useTranslations } from 'next-intl';
import { Icon } from '@/components/ui';

type SkillMap = components['schemas']['SkillMapDto'];

/** Skills by group: learned ones filled in, with how many of their lessons are done. */
export function SkillMapView({ map, headingLevel = 2 }: { map: SkillMap; headingLevel?: 2 | 3 }) {
  const t = useTranslations('skills');
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm font-semibold text-muted">
        {t('count', { learned: String(map.learned), total: String(map.total) })}
      </p>
      {map.categories.map((category) => (
        <section key={category.key} className="flex flex-col gap-2.5">
          <Heading className="text-xl">{t(`categories.${category.key}`)}</Heading>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {category.skills.map((skill) => (
              <li
                key={skill.key}
                className={clsx(
                  'flex items-center gap-3 rounded-row px-4 py-3',
                  skill.learned ? 'bg-sage-100 text-sage-800' : 'bg-surface',
                )}
              >
                <span
                  aria-hidden="true"
                  className={clsx(
                    'grid size-9 shrink-0 place-items-center rounded-full',
                    skill.learned ? 'bg-sage-600 text-sage-100' : 'bg-sand-300 text-muted',
                  )}
                >
                  <Icon name={skill.learned ? 'check' : 'lock'} />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold">{skill.name}</span>
                  <span className={clsx('text-sm', skill.learned ? '' : 'text-muted')}>
                    {t('progress', {
                      done: String(skill.lessonsDone),
                      total: String(skill.lessonsTotal),
                    })}
                  </span>
                </span>
                <span className="sr-only">{skill.learned ? t('learned') : t('notYet')}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
