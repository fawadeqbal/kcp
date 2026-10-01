'use client';

import { useTranslations } from 'next-intl';
import { type FormEvent, useState } from 'react';
import { Alert, AuthCard, Avatar, Button, Icon, PasswordField, TextField } from '@/components/ui';
import { Link, useRouter } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { homePath, useAuth } from '@/lib/auth-provider';
import { TwoFactorStep } from './two-factor-step';
import { errorMessageKey } from '@/lib/errors';
import { isEmail } from './validation';

export function LoginForm() {
  const t = useTranslations();
  const router = useRouter();
  const { login } = useAuth();
  const [twoFactor, setTwoFactor] = useState<{
    stage: 'setup' | 'verify';
    mfaToken: string;
  } | null>(null);
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
    if (result.twoFactor) {
      setTwoFactor(result.twoFactor);
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

  if (twoFactor) {
    return (
      <TwoFactorStep
        {...twoFactor}
        onStartOver={() => {
          setTwoFactor(null);
          setPassword('');
        }}
      />
    );
  }

  return (
    <AuthCard title={t('auth.login.title')} subtitle={t('auth.login.subtitle')}>
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
        <Link
          href="/forgot-password"
          className="-mt-1 self-start rounded-full text-sm font-bold text-brand-text underline-offset-4 hover:underline"
        >
          {t('auth.login.forgot')}
        </Link>
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
        <Button type="submit" size="lg" loading={submitting}>
          {t('auth.login.submit')}
        </Button>
      </form>
      <p className="text-sm text-muted">
        {t('auth.login.noAccount')}{' '}
        <Link
          href="/sign-up"
          className="font-bold text-brand-text underline-offset-4 hover:underline"
        >
          {t('auth.login.createAccount')}
        </Link>
      </p>
      <Link
        href="/login/student"
        className="flex items-center gap-3.5 rounded-row bg-brand-100 px-4.5 py-3.5 transition-colors hover:bg-brand-200"
      >
        <Avatar avatarKey="star" size="md" className="size-10" />
        <span className="min-w-0 flex-1">
          <span className="block font-bold">{t('auth.login.studentTitle')}</span>
          <span className="block text-sm text-brand-800">{t('auth.login.studentBody')}</span>
        </span>
        <Icon name="arrow" className="text-lg text-brand-text" />
      </Link>
      <p className="text-xs text-muted">{t('auth.login.staffNote')}</p>
    </AuthCard>
  );
}
