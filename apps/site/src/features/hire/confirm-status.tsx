'use client';

import { Alert, Button, buttonClass, Spinner } from '@kcp/ui';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { confirmHireRequest, type ConfirmResult } from './api';

type State = 'checking' | 'missing' | ConfirmResult;

export function HireConfirmChecking() {
  const t = useTranslations('hire.confirm');
  return (
    <p role="status" className="flex items-center gap-3 text-lg">
      <Spinner className="size-5 text-brand" />
      {t('checking')}
    </p>
  );
}

/** Confirms a "Hire our students" request with the token from the email link, once. */
export function HireConfirmStatus() {
  const t = useTranslations('hire.confirm');
  const token = useSearchParams().get('token')?.trim() || null;
  const [state, setState] = useState<State>(token ? 'checking' : 'missing');
  const sent = useRef<string | null>(null);
  const confirm = useCallback(async (value: string) => {
    setState('checking');
    setState(await confirmHireRequest(value));
  }, []);
  useEffect(() => {
    if (!token || sent.current === token) return;
    sent.current = token;
    void confirm(token);
  }, [token, confirm]);

  if (state === 'checking') return <HireConfirmChecking />;
  if (state === 'confirmed') {
    return (
      <div className="flex flex-col items-start gap-6">
        <Alert tone="success">
          <p className="text-lg font-bold">{t('confirmedTitle')}</p>
          <p className="mt-1 text-ink">{t('confirmed')}</p>
        </Alert>
        <Link href="/hire" className={buttonClass('secondary')}>
          {t('back')}
        </Link>
      </div>
    );
  }
  if (state === 'failed') {
    return (
      <div className="flex flex-col items-start gap-6">
        <Alert tone="error">{t('failed')}</Alert>
        <Button onClick={() => token && void confirm(token)}>{t('retry')}</Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-start gap-6">
      <Alert tone="warning">
        <p className="text-lg font-bold">{t('expiredTitle')}</p>
        <p className="mt-1 text-ink">{t('expired')}</p>
      </Alert>
      <Link href="/hire" className={buttonClass('primary')}>
        {t('again')}
      </Link>
    </div>
  );
}
