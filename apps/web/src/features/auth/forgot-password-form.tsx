'use client';

import { useTranslations } from 'next-intl';
import { type FormEvent, useState } from 'react';
import { Alert, AuthCard, Button, TextField } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { api, errorCode } from '@/lib/api';
import { errorMessageKey } from '@/lib/errors';
import { isEmail, isolate } from './validation';

export function ForgotPasswordForm() {
  const t = useTranslations();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isEmail(email)) {
      setError(t('validation.email'));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { error: apiError } = await api.POST('/v1/auth/password/forgot', {
        body: { email: email.trim() },
      });
      if (apiError) {
        setError(t(`errors.${errorMessageKey(errorCode(apiError))}`));
      } else {
        setSentTo(email.trim());
      }
    } catch {
      setError(t('errors.network'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title={t('auth.forgot.title')}
      subtitle={sentTo ? undefined : t('auth.forgot.subtitle')}
    >
      {sentTo ? (
        <Alert tone="success">{t('auth.forgot.sent', { email: isolate(sentTo) })}</Alert>
      ) : (
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
            error={error ?? undefined}
          />
          <Button type="submit" loading={submitting}>
            {t('auth.forgot.submit')}
          </Button>
        </form>
      )}
      <Link
        href="/login"
        className="text-center font-semibold text-brand-text underline-offset-4 hover:underline"
      >
        {t('auth.forgot.backToLogin')}
      </Link>
    </AuthCard>
  );
}
