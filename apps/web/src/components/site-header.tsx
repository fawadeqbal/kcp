'use client';

import { useTranslations } from 'next-intl';
import { Suspense } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth-provider';
import { LanguageSwitcher } from './language-switcher';
import { NotificationBell } from './notification-bell';
import { Avatar } from './ui';

export function SiteHeader() {
  const t = useTranslations();
  const { state, logout } = useAuth();
  const router = useRouter();

  return (
    <header className="print-hidden border-b border-line bg-surface">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-brand-700">
          {t('meta.title')}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <Suspense>
            <LanguageSwitcher />
          </Suspense>
          {state.status === 'authenticated' ? (
            <>
              {state.user.kind === 'STUDENT' ? (
                <Link
                  href="/learn"
                  className="flex items-center gap-2 font-medium hover:text-brand-700"
                >
                  <Avatar avatarKey={state.user.student?.avatarKey ?? 'rocket'} size="sm" />
                  {t('nav.learn')}
                </Link>
              ) : (
                <>
                  <Link href="/dashboard" className="font-medium hover:text-brand-700">
                    {t('nav.dashboard')}
                  </Link>
                  <Link href="/billing" className="font-medium hover:text-brand-700">
                    {t('nav.billing')}
                  </Link>
                </>
              )}
              <NotificationBell />
              <button
                type="button"
                className="font-medium text-muted hover:text-ink"
                onClick={async () => {
                  await logout();
                  router.replace('/');
                }}
              >
                {t('nav.logOut')}
              </button>
            </>
          ) : state.status === 'anonymous' ? (
            <>
              <Link href="/login" className="font-medium hover:text-brand-700">
                {t('nav.logIn')}
              </Link>
              <Link
                href="/sign-up"
                className="rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700"
              >
                {t('nav.signUp')}
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
