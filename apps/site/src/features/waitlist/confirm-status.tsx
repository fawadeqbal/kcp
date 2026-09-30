'use client';

import { Alert, Button, buttonClass, Spinner } from '@kcp/ui';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { confirmWaitlist, type ConfirmResult } from './api';

type State = 'checking' | 'missing' | ConfirmResult;

/** Shown while the page waits for the address bar (static pages read it in the browser). */
export function ConfirmChecking() {
  const t = useTranslations('confirm');
  return (
    <p role="status" className="flex items-center gap-3 text-lg">
      <Spinner className="size-5 text-brand-600" />
      {t('checking')}
    </p>
  );
}

/**
 * Confirms the waitlist email with the token from the link (?token=…), once. The token is
 * only sent to the API; it is never stored.
 */
export function ConfirmStatus() {
  const t = useTranslations('confirm');
  const nav = useTranslations('nav');
  const token = useSearchParams().get('token')?.trim() || null;
  const [state, setState] = useState<State>(token ? 'checking' : 'missing');
  const sent = useRef<string | null>(null);

  const confirm = useCallback(async (value: string) => {
    setState('checking');
    setState(await confirmWaitlist(value));
  }, []);

  useEffect(() => {
    // Once per token, also when React runs effects twice in development.
    if (!token || sent.current === token) return;
    sent.current = token;
    void confirm(token);
  }, [token, confirm]);

  switch (state) {
    case 'checking':
      return <ConfirmChecking />;
    case 'confirmed':
      return (
        <div className="flex flex-col items-start gap-6">
          <Alert tone="success">
            <p className="text-lg font-bold">{t('confirmedTitle')}</p>
            <p className="mt-1 text-ink">{t('confirmed')}</p>
          </Alert>
          <Link href="/" className={buttonClass('secondary')}>
            {t('home')}
          </Link>
        </div>
      );
    case 'expired':
    case 'missing':
      return (
        <div className="flex flex-col items-start gap-6">
          <Alert tone="warning">
            <p className="text-lg font-bold">
              {state === 'expired' ? t('expiredTitle') : t('missingTitle')}
            </p>
            <p className="mt-1 text-ink">{state === 'expired' ? t('expired') : t('missing')}</p>
          </Alert>
          <Link href="/waitlist" className={buttonClass('primary')}>
            {nav('waitlist')}
          </Link>
        </div>
      );
    case 'failed':
      return (
        <div className="flex flex-col items-start gap-6">
          <Alert tone="error">{t('failed')}</Alert>
          <Button onClick={() => token && void confirm(token)}>{t('retry')}</Button>
        </div>
      );
  }
}
