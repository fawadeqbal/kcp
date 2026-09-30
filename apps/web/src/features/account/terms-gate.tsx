'use client';

import { TERMS_VERSION } from '@kcp/shared';
import { useTranslations } from 'next-intl';
import { type ReactNode, useState } from 'react';
import { Alert, Button, Icon, IconBubble } from '@/components/ui';
import { Link, usePathname } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-provider';

/**
 * When the terms change (TERMS_VERSION), a parent accepts the new version before
 * going on. The terms and privacy pages stay readable meanwhile, and so does the
 * account page: a parent who doesn't accept can still download their data or delete
 * the account.
 */
const OPEN_PAGES = new Set(['/terms', '/privacy', '/account']);

export function TermsGate({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const { state, reloadUser, logout } = useAuth();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const mustAccept = state.status === 'authenticated' && state.user.mustAcceptTerms;
  if (!mustAccept || OPEN_PAGES.has(pathname)) return <>{children}</>;

  async function accept() {
    setBusy(true);
    setFailed(false);
    try {
      const { response } = await api.POST('/v1/auth/terms/accept', {
        body: { version: TERMS_VERSION },
      });
      if (!response.ok) throw new Error(String(response.status));
      await reloadUser();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const link = 'font-semibold text-brand-text underline underline-offset-4';
  const document =
    'flex min-h-12 items-center gap-3 rounded-full bg-raised px-4.5 font-semibold hover:bg-sand-200';
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 rounded-card bg-surface p-7 sm:p-9">
      <IconBubble icon="file" tone="brand" size="lg" />
      <h1 className="text-4xl">{t('account.termsTitle')}</h1>
      <p>{t('account.termsBody', { version: TERMS_VERSION })}</p>
      <ul className="flex flex-wrap gap-3">
        <li>
          <Link href="/terms" className={document}>
            <Icon name="file" className="text-muted" />
            {t('legal.termsTitle')}
          </Link>
        </li>
        <li>
          <Link href="/privacy" className={document}>
            <Icon name="shield" className="text-muted" />
            {t('legal.privacyTitle')}
          </Link>
        </li>
      </ul>
      <p className="text-muted">
        <Link href="/account" className={link}>
          {t('account.termsDecline')}
        </Link>
      </p>
      {failed ? <Alert tone="error">{t('account.termsFailed')}</Alert> : null}
      <div className="flex flex-wrap gap-3">
        <Button size="lg" loading={busy} onClick={() => void accept()}>
          {t('account.termsAccept')}
        </Button>
        <Button size="lg" variant="secondary" onClick={() => void logout()}>
          {t('nav.logOut')}
        </Button>
      </div>
    </div>
  );
}
