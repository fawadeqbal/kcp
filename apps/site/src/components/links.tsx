import type { Locale } from '@kcp/i18n';
import { clsx } from 'clsx';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { webAppUrl } from '@/lib/config';
import { ArrowIcon } from './icons';

/**
 * The look of @kcp/ui's Button for links in server components. (@kcp/ui's buttonClass
 * lives in a client module, which server components can't call.)
 */
type CtaVariant = 'primary' | 'secondary' | 'light' | 'outline-light';

export const ctaClass = (variant: CtaVariant = 'primary') =>
  clsx(
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 font-semibold transition-colors',
    variant === 'primary' && 'bg-brand-600 text-white hover:bg-brand-700',
    variant === 'secondary' && 'border border-line bg-surface text-ink hover:bg-brand-50',
    // On the dark brand band.
    variant === 'light' && 'bg-white text-brand-700 hover:bg-brand-50',
    variant === 'outline-light' && 'border border-white/70 text-white hover:bg-white/10',
  );

/** "Sign up as a parent": the sign-up page of the web app, in the same language. */
export async function SignUpLink({
  locale,
  variant = 'primary',
  children,
}: {
  locale: Locale;
  variant?: CtaVariant;
  children?: ReactNode;
}) {
  const t = await getTranslations('cta');
  return (
    <a href={webAppUrl(locale, '/sign-up')} className={ctaClass(variant)}>
      {children ?? t('signUp')}
    </a>
  );
}

export async function WaitlistLink({ variant = 'secondary' }: { variant?: CtaVariant }) {
  const t = await getTranslations('cta');
  return (
    <Link href="/waitlist" className={ctaClass(variant)}>
      {t('waitlist')}
    </Link>
  );
}

/** A text link with an arrow, e.g. "See how it works →". */
export function MoreLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 font-semibold text-brand-700 underline-offset-4 hover:underline"
    >
      {children}
      <ArrowIcon className="size-4" />
    </Link>
  );
}
