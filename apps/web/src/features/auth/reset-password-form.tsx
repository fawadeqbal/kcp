'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { Alert, AuthCard, Button, PasswordField } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { api, errorCode } from '@/lib/api';
import { errorMessageKey } from '@/lib/errors';
import { PASSWORD_MIN_LENGTH } from './validation';

export function ResetPasswordForm() {
  const t = useTranslations();
  const token = useSearchParams().get('token');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(t('validation.passwordLength', { min: PASSWORD_MIN_LENGTH }));
      return;
    }
    setError(null);
    setFormError(null);
    setSubmitting(true);
    try {
      const { error: apiError } = await api.POST('/v1/auth/password/reset', {
        body: { token, password },
      });
      if (apiError) {
        setFormError(t(`errors.${errorMessageKey(errorCode(apiError))}`));
      } else {
        setDone(true);
      }
    } catch {
      setFormError(t('errors.network'));
    } finally {
      setSubmitting(false);
    }
  }

  const loginLink = (
    <Link
      href="/login"
      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-5 font-semibold text-white hover:bg-brand-700"
    >
      {t('nav.logIn')}
    </Link>
  );

  if (!token) {
    return (
      <AuthCard title={t('auth.reset.title')}>
        <Alert tone="error">{t('auth.reset.missingToken')}</Alert>
        <Link
          href="/forgot-password"
          className="text-center font-semibold text-brand-700 underline"
        >
          {t('auth.verify.requestNew')}
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t('auth.reset.title')}>
      {done ? (
        <>
          <Alert tone="success">{t('auth.reset.success')}</Alert>
          {loginLink}
        </>
      ) : (
        <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
          <PasswordField
            label={t('auth.reset.newPassword')}
            name="password"
            autoComplete="new-password"
            hint={t('auth.passwordHint')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error ?? undefined}
          />
          {formError ? <Alert tone="error">{formError}</Alert> : null}
          <Button type="submit" loading={submitting}>
            {t('auth.reset.submit')}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
