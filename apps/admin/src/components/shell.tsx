'use client';

import { Icon, type IconName, LogoMark, PageSpinner } from '@kcp/ui';
import { clsx } from 'clsx';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { type AdminAbility, canOnAll } from '@/lib/ability';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const NAV: {
  href: string;
  label: string;
  icon: IconName;
  allowed: (ability: AdminAbility) => boolean;
}[] = [
  { href: '/', label: 'Overview', icon: 'grid', allowed: (a) => canOnAll(a, 'read', 'User') },
  {
    href: '/pilot',
    label: 'Pilot numbers',
    icon: 'chart',
    allowed: (a) => a.can('read', 'Metrics'),
  },
  { href: '/users', label: 'Users', icon: 'users', allowed: (a) => canOnAll(a, 'read', 'User') },
  { href: '/feedback', label: 'Feedback', icon: 'msg', allowed: (a) => a.can('read', 'Feedback') },
  {
    href: '/moderation',
    label: 'Room moderation',
    icon: 'flag',
    allowed: (a) => a.can('read', 'Moderation'),
  },
  {
    href: '/events',
    label: 'Hackathons',
    icon: 'rocket',
    allowed: (a) => canOnAll(a, 'read', 'EventTeam'),
  },
  {
    href: '/schools',
    label: 'Schools',
    icon: 'graduation',
    allowed: (a) => canOnAll(a, 'read', 'School'),
  },
  {
    href: '/app-crashes',
    label: 'App crashes',
    icon: 'alert',
    allowed: (a) => a.can('read', 'AppCrash'),
  },
  {
    href: '/payments',
    label: 'Payments',
    icon: 'wallet',
    allowed: (a) => a.can('read', 'Payment'),
  },
  {
    href: '/waitlist',
    label: 'Waitlist',
    icon: 'clock',
    allowed: (a) => a.can('read', 'Waitlist'),
  },
  { href: '/content', label: 'Content', icon: 'book', allowed: (a) => a.can('read', 'Content') },
  {
    href: '/mentors',
    label: 'Mentors and tutors',
    icon: 'award',
    allowed: (a) => canOnAll(a, 'read', 'MentorProfile'),
  },
  {
    href: '/countries',
    label: 'Countries and languages',
    icon: 'globe',
    allowed: (a) => a.can('read', 'PlanPrice'),
  },
  {
    href: '/flags',
    label: 'Feature flags',
    icon: 'toggle',
    allowed: (a) => a.can('read', 'FeatureFlag'),
  },
  {
    href: '/leaderboards',
    label: 'Leaderboards',
    icon: 'trophy',
    allowed: (a) => a.can('read', 'LeaderboardSeason'),
  },
  {
    href: '/consents',
    label: 'Parental consent',
    icon: 'shield',
    allowed: (a) => a.can('read', 'ConsentRecord') || a.can('read', 'ParentalConsent'),
  },
  { href: '/audit', label: 'Audit log', icon: 'file', allowed: (a) => a.can('read', 'AuditLog') },
];

/** The first page this staff member may open (the overview needs user access). */
export function firstPage(ability: AdminAbility): string {
  return NAV.find((item) => item.allowed(ability))?.href ?? '/content';
}

/** Unread feedback, for the count next to "Feedback" (checked again on every page). */
function useUnreadFeedback(enabled: boolean, pathname: string) {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let current = true;
    api
      .GET('/v1/admin/feedback', { params: { query: { page: 1, pageSize: 1 } } })
      .then(({ data }) => {
        if (current && data) setUnread(data.unread);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [enabled, pathname]);
  return unread;
}

/** "fawad@kcp.app" → "FA": the letters in the account chip. */
const initials = (email: string) =>
  email
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 2)
    .toUpperCase();

/**
 * The signed-in frame: a rounded sidebar with the sections and who is signed in
 * (a row on top on phones), and the page.
 */
export function Shell({ children }: { children: ReactNode }) {
  const { state, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const canReadFeedback = state.status === 'authenticated' && state.ability.can('read', 'Feedback');
  const unread = useUnreadFeedback(canReadFeedback, pathname);

  useEffect(() => {
    if (state.status === 'anonymous') router.replace('/login');
  }, [state.status, router]);

  if (state.status !== 'authenticated') {
    return <PageSpinner label="Loading" />;
  }

  const { user, ability } = state;
  const isCurrent = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-10 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <aside className="m-2 shrink-0 rounded-[1.875rem] bg-surface md:sticky md:top-3.5 md:m-3.5 md:me-0 md:h-[calc(100dvh-1.75rem)] md:w-63">
        <div className="flex h-full flex-col gap-4.5 px-3.5 py-5 md:overflow-y-auto">
          <Link href="/" className="flex items-center gap-2.5 rounded-full px-2">
            <LogoMark className="size-8.5 text-base" />
            <span className="font-display text-lg">KCP Admin</span>
          </Link>
          <nav aria-label="Admin" className="-mx-3.5 overflow-x-auto px-3.5 md:mx-0 md:px-0">
            <ul className="flex gap-0.5 md:flex-col">
              {NAV.filter((item) => item.allowed(ability)).map((item) => {
                const current = isCurrent(item.href);
                const count = item.href === '/feedback' ? unread : 0;
                return (
                  <li key={item.href} className="shrink-0">
                    <Link
                      href={item.href}
                      aria-current={current ? 'page' : undefined}
                      className={clsx(
                        'flex min-h-10 items-center gap-2.5 rounded-full px-3 text-sm font-semibold whitespace-nowrap transition-colors',
                        current
                          ? 'elev-sm bg-canvas text-ink'
                          : 'text-muted hover:bg-canvas/60 hover:text-ink',
                      )}
                    >
                      <Icon
                        name={item.icon}
                        className={clsx('text-base', current && 'text-brand')}
                      />
                      {item.label}
                      {count > 0 ? (
                        <span className="ms-auto grid h-5.5 min-w-5.5 place-items-center rounded-full bg-danger px-1.5 text-xs font-bold text-on-danger">
                          {count}
                          <span className="sr-only"> new</span>
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="flex items-center gap-2.5 rounded-row bg-raised p-3 md:mt-auto">
            <span
              aria-hidden="true"
              className="grid size-8.5 shrink-0 place-items-center rounded-full bg-sage-200 text-[0.8rem] font-bold text-sage-800"
            >
              {initials(user.email ?? user.displayName ?? '')}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.8rem] font-bold">{user.email}</p>
              <p className="text-xs text-muted">{user.role.name}</p>
            </div>
            <button
              type="button"
              aria-label="Log out"
              title="Log out"
              className="grid size-9 shrink-0 place-items-center rounded-full text-base text-muted hover:bg-ink/7 hover:text-ink"
              onClick={async () => {
                await logout();
                router.replace('/login');
              }}
            >
              <Icon name="logout" />
            </button>
          </div>
        </div>
      </aside>
      <main id="main" className="min-w-0 flex-1 px-4 py-6 md:px-9 md:py-7.5">
        <div className="mx-auto flex max-w-6xl flex-col gap-5.5">{children}</div>
      </main>
    </div>
  );
}

/** Page heading with an optional line of explanation, and tools on the right. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="text-4xl">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-muted">{description}</p> : null}
      </div>
      {actions}
    </header>
  );
}
