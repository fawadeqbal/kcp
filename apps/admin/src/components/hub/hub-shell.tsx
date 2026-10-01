'use client';

import { Badge, type BadgeTone } from '@kcp/ui';
import { clsx } from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { canOnAll } from '@/lib/ability';
import { useAuth } from '@/lib/auth';
import { humanize } from '@/lib/format';

const TABS = [
  { href: '/hub', label: 'Requests' },
  { href: '/hub/projects', label: 'Projects' },
  { href: '/hub/students', label: 'Students' },
  { href: '/hub/clients', label: 'Clients' },
  { href: '/hub/payouts', label: 'Payouts', subject: 'Payout' },
  { href: '/hub/accounts', label: 'Payout accounts', subject: 'PayoutAccount' },
  { href: '/hub/ledger', label: 'Ledger', subject: 'Ledger' },
  { href: '/hub/stories', label: 'Stories', subject: 'HubStory' },
  { href: '/hub/countries', label: 'Country rules' },
] as const;

export const linkClass = 'font-semibold text-brand-text underline-offset-4 hover:underline';

/** The hub's sections, under the page header. */
export function HubTabs() {
  const pathname = usePathname();
  const { state } = useAuth();
  const ability = state.status === 'authenticated' ? state.ability : null;
  const current = (href: string) =>
    href === '/hub'
      ? pathname === '/hub' || pathname.startsWith('/hub/requests')
      : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <nav aria-label="Hub sections" className="-mx-1 overflow-x-auto">
      <ul className="flex gap-1.5 px-1">
        {TABS.filter(
          (tab) => !('subject' in tab) || (ability && canOnAll(ability, 'read', tab.subject)),
        ).map((tab) => (
          <li key={tab.href} className="shrink-0">
            <Link
              href={tab.href}
              aria-current={current(tab.href) ? 'page' : undefined}
              className={clsx(
                'inline-flex min-h-10 items-center rounded-full px-4 text-sm font-bold transition-colors',
                current(tab.href)
                  ? 'bg-brand-100 text-brand-800'
                  : 'text-muted hover:bg-ink/7 hover:text-ink',
              )}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** A page of the hub: its title, what it's for, the tabs, then the content. */
export function HubPage({
  title,
  description,
  actions,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-4xl">{title}</h1>
          {description ? <p className="mt-1 max-w-3xl text-muted">{description}</p> : null}
        </div>
        {actions}
      </header>
      <HubTabs />
      {children}
    </div>
  );
}

const TONES: Record<string, BadgeTone> = {
  NEW: 'warning',
  UNCONFIRMED: 'neutral',
  ACCEPTED: 'success',
  DECLINED: 'neutral',
  SCOPING: 'neutral',
  QUOTED: 'brand',
  AWAITING_DEPOSIT: 'warning',
  ACTIVE: 'brand',
  DELIVERED: 'success',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
  OPEN: 'warning',
  PAID: 'success',
  VOID: 'neutral',
  DRAFT: 'neutral',
  APPROVED: 'success',
  SENT: 'brand',
  AWAITING_PARENT: 'warning',
  CONFIRMED: 'brand',
  SENDING: 'brand',
  FAILED: 'danger',
  PUBLISHED: 'success',
  WITHDRAWN: 'neutral',
  SUBMITTED: 'warning',
  CHANGES_REQUESTED: 'brand',
  COOLING: 'warning',
  CHECKING: 'warning',
  READY: 'success',
};

export function HubBadge({ status }: { status: string }) {
  return <Badge tone={TONES[status] ?? 'neutral'}>{humanize(status)}</Badge>;
}

/** Super admins approve and send payout batches (the API checks again). */
export function useIsSuperAdmin() {
  const { state } = useAuth();
  return state.status === 'authenticated' && state.user.role.key === 'super_admin';
}
