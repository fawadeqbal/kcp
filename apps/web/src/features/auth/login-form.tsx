'use client';

import { useTranslations } from 'next-intl';
import { type FormEvent, useState } from 'react';
import { Alert, AuthCard, Button, PasswordField, TextField } from '@/components/ui';
import { Link, useRouter } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { homePath, useAuth } from '@/lib/auth-provider';
import { errorMessageKey } from '@/lib/errors';
import { isEmail } from './validation';

export function LoginForm() {
  const t = useTranslations();
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setNotice(null);
    setUnverified(false);
    const found = {
      email: isEmail(email) ? undefined : t('validation.email'),
      password: password ? undefined : t('validation.required'),
    };
    setErrors(found);
    if (found.email || found.password) return;

    setSubmitting(true);
    const result = await login(email.trim(), password);
    setSubmitting(false);
    if (result.ok) {
      router.replace(homePath(result.user));
      return;
    }
    if (result.staff) {
      setNotice(t('auth.login.staffNote'));
      return;
    }
    setUnverified(result.code === 'EMAIL_NOT_VERIFIED');
    setFormError(t(`errors.${errorMessageKey(result.code, result.network)}`));
  }

  async function resend() {
    await api.POST('/v1/auth/email/resend', { body: { email: email.trim() } });
    setUnverified(false);
    setFormError(null);
    setNotice(t('auth.checkEmail.resent'));
  }

  return (
    <AuthCard title={t('auth.login.title')}>
      <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
        <TextField
          label={t('auth.email')}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          dir="ltr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <PasswordField
          label={t('auth.password')}
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        {formError ? (
          <Alert tone="error">
            {formError}
            {unverified ? (
              <button type="button" onClick={resend} className="ms-2 font-semibold underline">
                {t('auth.login.resendLink')}
              </button>
            ) : null}
          </Alert>
        ) : null}
        {notice ? <Alert>{notice}</Alert> : null}
        <Button type="submit" loading={submitting}>
          {t('auth.login.submit')}
        </Button>
      </form>
      <Link
        href="/forgot-password"
        className="text-center font-semibold text-brand-700 underline-offset-4 hover:underline"
      >
        {t('auth.login.forgot')}
      </Link>
      <Link
        href="/login/student"
        className="rounded-xl border border-line px-4 py-3 text-center font-semibold hover:bg-brand-50"
      >
        {t('auth.login.studentLink')}
      </Link>
      <p className="text-center text-muted">
        {t('auth.login.noAccount')}{' '}
        <Link
          href="/sign-up"
          className="font-semibold text-brand-700 underline-offset-4 hover:underline"
        >
          {t('auth.login.createAccount')}
        </Link>
      </p>
    </AuthCard>
  );
}
