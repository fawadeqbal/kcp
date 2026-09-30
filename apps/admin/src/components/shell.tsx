'use client';

import { PageSpinner } from '@kcp/ui';
import { clsx } from 'clsx';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';
import type { AdminAbility } from '@/lib/ability';
import { useAuth } from '@/lib/auth';

const NAV: { href: string; label: string; allowed: (ability: AdminAbility) => boolean }[] = [
  { href: '/', label: 'Overview', allowed: (a) => a.can('read', 'User') },
  { href: '/pilot', label: 'Pilot numbers', allowed: (a) => a.can('read', 'Metrics') },
  { href: '/users', label: 'Users', allowed: (a) => a.can('read', 'User') },
  { href: '/feedback', label: 'Feedback', allowed: (a) => a.can('read', 'Feedback') },
  { href: '/payments', label: 'Payments', allowed: (a) => a.can('read', 'Payment') },
  { href: '/waitlist', label: 'Waitlist', allowed: (a) => a.can('read', 'Waitlist') },
  { href: '/content', label: 'Content', allowed: (a) => a.can('read', 'Content') },
  {
    href: '/countries',
    label: 'Countries and languages',
    allowed: (a) => a.can('read', 'PlanPrice'),
  },
  { href: '/flags', label: 'Feature flags', allowed: (a) => a.can('read', 'FeatureFlag') },
  {
    href: '/leaderboards',
    label: 'Leaderboards',
    allowed: (a) => a.can('read', 'LeaderboardSeason'),
  },
  { href: '/consents', label: 'Parental consent', allowed: (a) => a.can('read', 'ConsentRecord') },
  { href: '/audit', label: 'Audit log', allowed: (a) => a.can('read', 'AuditLog') },
];

/** The signed-in frame: navigation on the side (top on phones) and the page. */
export function Shell({ children }: { children: ReactNode }) {
  const { state, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-10 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <aside className="shrink-0 border-b border-line bg-surface md:w-60 md:border-e md:border-b-0">
        <div className="flex flex-col gap-4 p-4 md:sticky md:top-0 md:h-dvh md:overflow-y-auto">
          <Link href="/" className="text-lg font-bold text-brand-700">
            KCP Admin
          </Link>
          <nav aria-label="Admin">
            <ul className="flex flex-wrap gap-1 md:flex-col">
              {NAV.filter((item) => item.allowed(ability)).map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isCurrent(item.href) ? 'page' : undefined}
                    className={clsx(
                      'block rounded-lg px-3 py-1.5 font-medium',
                      isCurrent(item.href)
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-muted hover:bg-canvas hover:text-ink',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-auto flex flex-col gap-1 border-t border-line pt-4 text-sm">
            <span className="font-medium break-all">{user.email}</span>
            <span className="text-muted">{user.role.name}</span>
            <button
              type="button"
              className="mt-2 self-start font-semibold text-brand-700 underline-offset-4 hover:underline"
              onClick={async () => {
                await logout();
                router.replace('/login');
              }}
            >
              Log out
            </button>
          </div>
        </div>
      </aside>
      <main id="main" className="min-w-0 flex-1 px-4 py-8 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">{children}</div>
      </main>
    </div>
  );
}

/** Page heading with an optional line of explanation. */
export function PageHeader({ title, description }: { title: ReactNode; description?: ReactNode }) {
  return (
    <header>
      <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
      {description ? <p className="mt-1 max-w-3xl text-muted">{description}</p> : null}
    </header>
  );
}
