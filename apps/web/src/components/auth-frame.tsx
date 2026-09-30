'use client';

import { clsx } from 'clsx';
import { useTranslations } from 'next-intl';
import { type ReactNode, Suspense } from 'react';
import { Icon, type IconName } from '@kcp/ui';
import { LanguageSwitcher } from './language-switcher';
import { Brand } from './site-header';

/** Pages shown as a sign-in screen: the form beside a picture panel, no site header. */
export const AUTH_PATHS = [
  '/login',
  '/login/student',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/check-email',
  '/verify-email',
];

/**
 * A sign-in screen: on wide screens a rounded panel with the promise and a few soft
 * circles (sage for parents, terracotta for students), and the form on the page's
 * ground; on phones just the logo and the form.
 */
export function AuthFrame({ student, children }: { student: boolean; children: ReactNode }) {
  const t = useTranslations();
  const points: [IconName, string][] = [
    ['shield', t('auth.panel.parents')],
    ['globe', t('auth.panel.languages')],
    ['rocket', t('auth.panel.build')],
  ];
  return (
    <div className="grid min-h-dvh flex-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div
        className={clsx(
          'relative isolate m-4 hidden flex-col overflow-hidden rounded-[2.5rem] p-12 lg:flex',
          student ? 'bg-brand-200 text-brand-900' : 'bg-sage-200 text-sage-900',
        )}
      >
        <span
          aria-hidden="true"
          className={clsx(
            'absolute -end-30 -bottom-35 -z-10 size-115 rounded-full',
            student ? 'bg-brand-300' : 'bg-sage-300',
          )}
        />
        <span
          aria-hidden="true"
          className={clsx(
            'absolute end-30 bottom-45 -z-10 size-30 rounded-full',
            student ? 'bg-sage-300' : 'bg-brand-300',
          )}
        />
        <span
          aria-hidden="true"
          className="absolute end-18 top-22 -z-10 size-14 rounded-full bg-brand"
        />
        <Brand />
        <div className="mt-auto flex max-w-md flex-col gap-4">
          <p className="font-display text-[2.75rem] leading-[1.08]">{t('home.title')}</p>
          <ul
            className={clsx(
              'flex flex-col gap-2.5 font-semibold',
              student ? 'text-brand-800' : 'text-sage-800',
            )}
          >
            {points.map(([icon, text]) => (
              <li key={icon} className="flex items-center gap-2.5">
                <Icon name={icon} className="text-lg" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex min-w-0 flex-col px-5 py-5 sm:px-10 lg:py-8 lg:ps-10 lg:pe-16">
        <div className="flex items-center justify-between gap-4">
          <span className="lg:invisible">
            <Brand />
          </span>
          <Suspense>
            <LanguageSwitcher />
          </Suspense>
        </div>
        <div className="flex flex-1 flex-col justify-center py-10">{children}</div>
      </div>
    </div>
  );
}
