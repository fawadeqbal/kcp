'use client';

import type { components } from '@kcp/api-client-ts';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';

type StudentClass = components['schemas']['StudentClassDto'];

/** On the learn home: lessons a teacher set that aren't done yet (only when there are some). */
export function ClassLessonsCard() {
  const t = useTranslations('classes');
  const format = useFormatter();
  const [todo, setTodo] = useState<
    (StudentClass['assignments'][number] & { className: string })[] | null
  >(null);

  useEffect(() => {
    let current = true;
    api
      .GET('/v1/classes')
      .then(({ data }) => {
        if (!current || !data) return;
        setTodo(
          data
            .filter((c) => c.status === 'APPROVED')
            .flatMap((c) =>
              c.assignments.filter((a) => !a.done).map((a) => ({ ...a, className: c.name })),
            )
            .toSorted(
              (a, b) =>
                (a.dueAt ? new Date(a.dueAt).getTime() : Infinity) -
                (b.dueAt ? new Date(b.dueAt).getTime() : Infinity),
            ),
        );
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, []);

  if (!todo || todo.length === 0) return null;
  return (
    <section
      aria-labelledby="class-lessons-heading"
      className="flex flex-col gap-3 rounded-card bg-surface p-5"
    >
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="class-lessons-heading" className="flex-1 text-xl">
          {t('fromTeacher')}
        </h2>
        <Link href="/learn/classes" className="text-sm font-semibold underline">
          {t('allClasses')}
        </Link>
      </div>
      <ul className="flex flex-col gap-2">
        {todo.slice(0, 3).map((a) => (
          <li key={`${a.className}-${a.lessonId}`}>
            <Link
              href={`/learn/${a.lessonId}`}
              className="flex items-center gap-3 rounded-row bg-raised p-3 hover:bg-sand-200"
            >
              <Icon name="book" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold">
                  <bdi>{a.title}</bdi>
                </span>
                <span className="text-sm text-muted">
                  <bdi>{a.className}</bdi>
                  {a.dueAt
                    ? ` · ${t('due', {
                        date: format.dateTime(new Date(a.dueAt), { dateStyle: 'medium' }),
                      })}`
                    : ''}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
