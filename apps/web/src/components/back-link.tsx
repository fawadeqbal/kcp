import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { Icon } from './ui';

/** "Back to …": a small pill with a chevron that points back (mirrored in RTL). */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="flex min-h-10 w-fit shrink-0 items-center gap-1.5 rounded-full bg-surface ps-2.5 pe-3.5 text-sm font-semibold hover:bg-sand-300"
    >
      <Icon name="chevL" className="text-base" />
      {children}
    </Link>
  );
}
