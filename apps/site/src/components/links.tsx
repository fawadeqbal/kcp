import type { Locale } from '@kcp/i18n';
import { type ButtonSize, buttonClass } from '@kcp/ui';
import { clsx } from 'clsx';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { webAppUrl } from '@/lib/config';
import { ArrowIcon } from './icons';

/**
 * Links that look like @kcp/ui's buttons. `onBrand` is the light pill on the terracotta
 * band at the end of a page.
 */
type CtaVariant = 'primary' | 'secondary' | 'onBrand';

export const ctaClass = (variant: CtaVariant = 'primary', size: ButtonSize = 'md') =>
  variant === 'onBrand'
    ? clsx(
        'font-display inline-flex items-center justify-center gap-2 rounded-full bg-canvas leading-tight text-ink transition-colors hover:bg-raised',
        size === 'lg' ? 'min-h-14 px-7 text-[1.05rem]' : 'min-h-11 px-5 text-[0.95rem]',
      )
    : buttonClass(variant, size);

/** "Create a parent account": the sign-up page of the web app, in the same language. */
export async function SignUpLink({
  locale,
  variant = 'primary',
  size = 'md',
  arrow = false,
  children,
}: {
  locale: Locale;
  variant?: CtaVariant;
  size?: ButtonSize;
  /** An arrow after the words (the hero's main button). */
  arrow?: boolean;
  children?: ReactNode;
}) {
  const t = await getTranslations('cta');
  return (
    <a href={webAppUrl(locale, '/sign-up')} className={ctaClass(variant, size)}>
      {children ?? t('signUp')}
      {arrow ? <ArrowIcon className="size-[1.1em]" /> : null}
    </a>
  );
}

export async function WaitlistLink({
  variant = 'secondary',
  size = 'md',
}: {
  variant?: CtaVariant;
  size?: ButtonSize;
}) {
  const t = await getTranslations('cta');
  return (
    <Link href="/waitlist" className={ctaClass(variant, size)}>
      {t('waitlist')}
    </Link>
  );
}

/** A text link with an arrow, e.g. "See how it works →". */
export function MoreLink({
  href,
  tone = 'brand',
  children,
}: {
  href: string;
  tone?: 'brand' | 'sage';
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        'inline-flex items-center gap-1.5 font-bold underline-offset-4 hover:underline',
        tone === 'brand' ? 'text-brand-text' : 'text-sage-text',
      )}
    >
      {children}
      <ArrowIcon className="size-4" />
    </Link>
  );
}
