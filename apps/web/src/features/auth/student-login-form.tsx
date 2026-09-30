'use client';

import { useTranslations } from 'next-intl';
import { type FormEvent, useState } from 'react';
import {
  Alert,
  AuthCard,
  Button,
  Icon,
  IconBubble,
  PasswordField,
  TextField,
} from '@/components/ui';
import { Link, useRouter } from '@/i18n/navigation';
import { homePath, useAuth } from '@/lib/auth-provider';
import { errorMessageKey } from '@/lib/errors';

/** Children log in with the username their parent got when creating the account. */
export function StudentLoginForm() {
  const t = useTranslations();
  const router = useRouter();
  const { state, loginStudent, logout } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const found = {
      username: username.trim() ? undefined : t('validation.required'),
      password: password ? undefined : t('validation.required'),
    };
    setErrors(found);
    if (found.username || found.password) return;

    setSubmitting(true);
    const result = await loginStudent(username.trim().toLowerCase(), password);
    setSubmitting(false);
    if (result.ok) {
      router.replace(homePath(result.user));
      return;
    }
    setFormError(
      result.code === 'INVALID_CREDENTIALS'
        ? t('auth.student.invalid')
        : t(`errors.${errorMessageKey(result.code, result.network)}`),
    );
  }

  // On a shared family computer, a parent may still be signed in.
  if (state.status === 'authenticated' && state.user.kind === 'ADULT') {
    return (
      <AuthCard title={t('auth.student.title')}>
        <Alert>{t('auth.student.someoneSignedIn', { name: state.user.displayName ?? '' })}</Alert>
        <Button size="lg" onClick={() => void logout()}>
          {t('auth.student.logOutFirst')}
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t('auth.student.title')} subtitle={t('auth.student.subtitle')}>
      <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
        <TextField
          label={t('auth.student.username')}
          hint={t('auth.student.usernameHint')}
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          dir="ltr"
          className="font-latin"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={errors.username}
        />
        <PasswordField
          label={t('auth.password')}
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        {formError ? <Alert tone="error">{formError}</Alert> : null}
        <Button type="submit" size="lg" loading={submitting}>
          {t('auth.student.submit')}
          <Icon name="arrow" />
        </Button>
      </form>
      <p className="flex gap-2.5 rounded-row bg-raised px-4 py-3 text-sm text-muted">
        <Icon name="key" className="mt-0.5 shrink-0 text-base" />
        {t('auth.student.forgot')}
      </p>
      <Link
        href="/login"
        className="flex items-center gap-3.5 rounded-row bg-sage-100 px-4.5 py-3.5 font-bold text-sage-900 transition-colors hover:bg-sage-200"
      >
        <IconBubble icon="users" tone="sageSolid" size="sm" />
        <span className="flex-1">{t('auth.student.parentLink')}</span>
        <Icon name="arrow" className="text-lg text-sage-text" />
      </Link>
    </AuthCard>
  );
}
