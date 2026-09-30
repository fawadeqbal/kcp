'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Alert, AuthCard } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';

// Each link works once. React may run effects twice in development, so share one request per token.
const attempts = new Map<string, Promise<boolean>>();

function verifyOnce(token: string): Promise<boolean> {
  let attempt = attempts.get(token);
  if (!attempt) {
    attempt = api
      .POST('/v1/auth/email/verify', { body: { token } })
      .then(({ data }) => data?.status === 'verified')
      .catch(() => false);
    attempts.set(token, attempt);
  }
  return attempt;
}

export function VerifyEmail() {
  const t = useTranslations();
  const token = useSearchParams().get('token');
  const [state, setState] = useState<'verifying' | 'success' | 'failed' | 'missing'>(
    token ? 'verifying' : 'missing',
  );

  useEffect(() => {
    if (!token) return;
    void verifyOnce(token).then((ok) => setState(ok ? 'success' : 'failed'));
  }, [token]);

  return (
    <AuthCard title={t('auth.verify.title')}>
      {state === 'verifying' ? (
        <div className="flex justify-center py-4" aria-live="polite">
          <span className="size-8 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" />
        </div>
      ) : null}
      {state === 'success' ? (
        <>
          <Alert tone="success">{t('auth.verify.success')}</Alert>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-5 font-semibold text-white hover:bg-brand-700"
          >
            {t('nav.logIn')}
          </Link>
        </>
      ) : null}
      {state === 'failed' || state === 'missing' ? (
        <>
          <Alert tone="error">
            {state === 'failed' ? t('auth.verify.failed') : t('auth.verify.missingToken')}
          </Alert>
          <Link
            href="/login"
            className="text-center font-semibold text-brand-700 underline-offset-4 hover:underline"
          >
            {t('auth.verify.requestNew')}
          </Link>
        </>
      ) : null}
    </AuthCard>
  );
}
