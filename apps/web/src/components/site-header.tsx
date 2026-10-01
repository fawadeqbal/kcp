'use client';

import { type IconName, Popover } from '@kcp/ui';
import { clsx } from 'clsx';
import { useTranslations } from 'next-intl';
import { Suspense, useEffect, useState } from 'react';
import { isolate } from '@/features/auth/validation';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { areaOf, useAuth } from '@/lib/auth-provider';
import { LanguageSwitcher } from './language-switcher';
import { NotificationBell } from './notification-bell';
import { Avatar, buttonClass, Icon, LogoMark } from './ui';

type NavItem = { href: string; label: string; icon: IconName; current: boolean };

/** The logo and the product's name, leading home. */
export function Brand() {
  const t = useTranslations('meta');
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5 rounded-full">
      <LogoMark />
      <span className="font-display text-xl whitespace-nowrap">{t('title')}</span>
    </Link>
  );
}

/** The pill of main sections: the current one sits on a raised ground. */
function PillNav({ label, items }: { label: string; items: NavItem[] }) {
  return (
    <nav aria-label={label} className="min-w-0">
      <ul className="flex w-max gap-1 rounded-full bg-surface p-1.25">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={item.current ? 'page' : undefined}
              className={clsx(
                'flex min-h-10 items-center gap-2 rounded-full px-3.5 text-sm font-semibold whitespace-nowrap transition-colors',
                item.current ? 'elev-sm bg-canvas text-ink' : 'text-muted hover:text-ink',
              )}
            >
              <Icon name={item.icon} className={clsx('text-base', item.current && 'text-brand')} />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Whether to show "Hub" in the menu: for students of hub age, and for parents with a
 * child of hub age (or something waiting for them). Asked once per account.
 */
function useHubInNav() {
  const { state } = useAuth();
  const [shown, setShown] = useState<{ id: string; shown: boolean } | null>(null);
  const user = state.status === 'authenticated' ? state.user : null;
  const area = user ? areaOf(user) : null;
  useEffect(() => {
    if (!user || (area !== 'STUDENT' && area !== 'PARENT') || shown?.id === user.id) return;
    let cancelled = false;
    void (async () => {
      try {
        if (area === 'STUDENT') {
          const { data } = await api.GET('/v1/hub/me');
          const age = data?.steps.find((s) => s.key === 'AGE')?.done ?? false;
          if (!cancelled) setShown({ id: user.id, shown: age || Boolean(data?.eligible) });
        } else {
          const [family, approvals] = await Promise.all([
            api.GET('/v1/hub/family'),
            api.GET('/v1/hub/approvals'),
          ]);
          const age = (family.data ?? []).some(
            (c) => c.readinessPassed || c.eligibility.steps.find((s) => s.key === 'AGE')?.done,
          );
          if (!cancelled)
            setShown({ id: user.id, shown: age || (approvals.data ?? []).length > 0 });
        }
      } catch {
        if (!cancelled) setShown({ id: user.id, shown: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, area, shown?.id]);
  return Boolean(user && shown?.id === user.id && shown.shown);
}

export function SiteHeader() {
  const t = useTranslations();
  const { state, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const is = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const logOut = async () => {
    await logout();
    router.replace('/');
  };

  const hubShown = useHubInNav();
  let nav: NavItem[] | null = null;
  if (state.status === 'authenticated' && areaOf(state.user) === 'CLIENT') {
    nav = [
      {
        href: '/client',
        label: t('nav.clientProjects'),
        icon: 'rocket',
        current: is('/client') && !is('/client/settings'),
      },
      {
        href: '/client/settings',
        label: t('nav.clientSettings'),
        icon: 'settings',
        current: is('/client/settings'),
      },
    ];
  } else if (state.status === 'authenticated' && state.user.kind === 'STUDENT') {
    const other = [
      '/learn/league',
      '/learn/friends',
      '/learn/rooms',
      '/learn/events',
      '/learn/classes',
      '/learn/skills',
      '/learn/leaderboard',
      '/learn/badges',
      '/learn/portfolio',
      '/learn/hub',
    ].some(is);
    nav = [
      { href: '/learn', label: t('nav.learn'), icon: 'book', current: is('/learn') && !other },
      // The league page links to the other leaderboards.
      {
        href: '/learn/league',
        label: t('nav.league'),
        icon: 'trophy',
        current: is('/learn/league') || is('/learn/leaderboard'),
      },
      {
        href: '/learn/friends',
        label: t('nav.friends'),
        icon: 'users',
        current:
          is('/learn/friends') || is('/learn/rooms') || is('/learn/events') || is('/learn/classes'),
      },
      {
        href: '/learn/badges',
        label: t('nav.badges'),
        icon: 'award',
        current: is('/learn/badges') || is('/learn/skills'),
      },
      {
        href: '/learn/portfolio',
        label: t('nav.portfolio'),
        icon: 'rocket',
        current: is('/learn/portfolio'),
      },
      ...(hubShown
        ? [
            {
              href: '/learn/hub',
              label: t('nav.hub'),
              icon: 'zap' as const,
              current: is('/learn/hub'),
            },
          ]
        : []),
    ];
  } else if (state.status === 'authenticated' && areaOf(state.user) === 'MENTOR') {
    nav = [
      {
        href: '/mentor',
        label: t('nav.reviews'),
        icon: 'msg',
        current:
          is('/mentor') &&
          !is('/mentor/events') &&
          !is('/mentor/teams') &&
          !is('/mentor/judging') &&
          !is('/mentor/rooms') &&
          !is('/mentor/hub'),
      },
      {
        href: '/mentor/events',
        label: t('nav.events'),
        icon: 'trophy',
        current:
          is('/mentor/events') ||
          is('/mentor/teams') ||
          is('/mentor/judging') ||
          is('/mentor/rooms'),
      },
      { href: '/mentor/hub', label: t('nav.hub'), icon: 'zap', current: is('/mentor/hub') },
    ];
  } else if (state.status === 'authenticated' && areaOf(state.user) === 'TEACHER') {
    nav = [
      {
        href: '/teacher',
        label: t('nav.classes'),
        icon: 'users',
        current: is('/teacher') && !is('/teacher/rooms'),
      },
      { href: '/teacher/rooms', label: t('nav.rooms'), icon: 'msg', current: is('/teacher/rooms') },
    ];
  } else if (state.status === 'authenticated') {
    nav = [
      {
        href: '/dashboard',
        label: t('nav.dashboard'),
        icon: 'grid',
        current:
          (is('/dashboard') || is('/children') || is('/reports')) &&
          !(hubShown && /^\/children\/[^/]+\/hub/.test(pathname)),
      },
      ...(hubShown
        ? [
            {
              href: '/hub',
              label: t('nav.hub'),
              icon: 'zap' as const,
              current: is('/hub') || is('/payouts') || /^\/children\/[^/]+\/hub/.test(pathname),
            },
          ]
        : []),
      { href: '/billing', label: t('nav.billing'), icon: 'card', current: is('/billing') },
    ];
  }

  return (
    <header className="print-hidden">
      <div className="mx-auto flex max-w-320 flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4.5 sm:px-6 lg:px-10">
        <Brand />
        {nav ? (
          // On phones the sections get a row of their own, which scrolls sideways.
          <div className="order-last -mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 lg:order-none lg:mx-0 lg:w-auto lg:px-0">
            <PillNav label={t('nav.main')} items={nav} />
          </div>
        ) : null}
        <div className="ms-auto flex items-center gap-2.5">
          <Suspense>
            <LanguageSwitcher />
          </Suspense>
          {state.status === 'authenticated' ? (
            <>
              <NotificationBell />
              {state.user.kind === 'STUDENT' ? (
                <Popover
                  label={t('nav.studentMenu', {
                    nickname: isolate(state.user.student?.nickname ?? ''),
                  })}
                  panelClassName="w-56"
                  buttonClassName="flex min-h-10 items-center gap-2.5 rounded-full bg-surface p-1 pe-3.5 text-sm font-semibold hover:bg-sand-300"
                  button={
                    <>
                      <Avatar avatarKey={state.user.student?.avatarKey ?? 'rocket'} size="sm" />
                      <bdi className="font-latin max-w-32 truncate max-sm:sr-only">
                        {state.user.student?.nickname}
                      </bdi>
                    </>
                  }
                >
                  <ul className="flex flex-col gap-0.5">
                    <li>
                      <Link
                        href="/learn/portfolio"
                        className="flex min-h-11 items-center gap-3 rounded-full px-4 font-semibold hover:bg-ink/7"
                      >
                        <Icon name="rocket" className="text-muted" />
                        {t('nav.portfolio')}
                      </Link>
                    </li>
                    <li>
                      <button
                        type="button"
                        onClick={() => void logOut()}
                        className="flex min-h-11 w-full items-center gap-3 rounded-full px-4 font-semibold hover:bg-ink/7"
                      >
                        <Icon name="logout" className="text-muted" />
                        {t('nav.logOut')}
                      </button>
                    </li>
                  </ul>
                </Popover>
              ) : (
                <button
                  type="button"
                  className="flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold text-muted hover:bg-ink/7 hover:text-ink"
                  onClick={() => void logOut()}
                >
                  <Icon name="logout" className="text-base" />
                  <span className="max-sm:sr-only">{t('nav.logOut')}</span>
                </button>
              )}
            </>
          ) : state.status === 'anonymous' ? (
            <>
              <Link
                href="/login"
                className="flex min-h-10 items-center rounded-full px-3 text-sm font-semibold hover:bg-ink/7"
              >
                {t('nav.logIn')}
              </Link>
              <Link href="/sign-up" className={clsx(buttonClass('primary', 'sm'), 'max-sm:hidden')}>
                {t('nav.signUp')}
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
