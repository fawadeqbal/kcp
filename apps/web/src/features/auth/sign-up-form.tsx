'use client';

import type { components } from '@kcp/api-client-ts';
import { useLocale, useTranslations } from 'next-intl';
import { type FormEvent, useEffect, useState } from 'react';
import {
  Alert,
  AuthCard,
  Button,
  Checkbox,
  PasswordField,
  SelectField,
  TextField,
} from '@/components/ui';
import { Link, useRouter } from '@/i18n/navigation';
import { api, errorCode } from '@/lib/api';
import { errorMessageKey } from '@/lib/errors';
import { isEmail, PASSWORD_MIN_LENGTH, rememberPendingEmail } from './validation';

type Country = components['schemas']['CountryDto'];
type Errors = Partial<
  Record<'displayName' | 'email' | 'password' | 'countryCode' | 'acceptTerms', string>
>;

export function SignUpForm() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [countries, setCountries] = useState<Country[]>([]);
  const [form, setForm] = useState({
    displayName: '',
    email: '',
    password: '',
    countryCode: '',
    acceptTerms: false,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void api.GET('/v1/countries').then(({ data }) => setCountries(data ?? []));
  }, []);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function validate(): Errors {
    const next: Errors = {};
    if (!form.displayName.trim()) next.displayName = t('validation.required');
    if (!isEmail(form.email)) next.email = t('validation.email');
    if (form.password.length < PASSWORD_MIN_LENGTH) {
      next.password = t('validation.passwordLength', { min: PASSWORD_MIN_LENGTH });
    }
    if (!form.countryCode) next.countryCode = t('validation.required');
    if (!form.acceptTerms) next.acceptTerms = t('validation.acceptTerms');
    return next;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    try {
      const { error } = await api.POST('/v1/auth/parents/sign-up', {
        body: {
          displayName: form.displayName.trim(),
          email: form.email.trim(),
          password: form.password,
          countryCode: form.countryCode,
          languageCode: locale,
          acceptTerms: true,
        },
      });
      if (error) {
        setFormError(t(`errors.${errorMessageKey(errorCode(error))}`));
        return;
      }
      rememberPendingEmail(form.email.trim());
      router.push('/check-email');
    } catch {
      setFormError(t('errors.network'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title={t('auth.signUp.title')} subtitle={t('auth.signUp.subtitle')}>
      <Alert>{t('auth.signUp.safetyNote')}</Alert>
      <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
        <TextField
          label={t('auth.signUp.name')}
          name="displayName"
          autoComplete="name"
          value={form.displayName}
          onChange={(e) => update('displayName', e.target.value)}
          error={errors.displayName}
          maxLength={80}
        />
        <TextField
          label={t('auth.email')}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          dir="ltr"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          error={errors.email}
        />
        <PasswordField
          label={t('auth.password')}
          name="password"
          autoComplete="new-password"
          hint={t('auth.passwordHint')}
          value={form.password}
          onChange={(e) => update('password', e.target.value)}
          error={errors.password}
        />
        <SelectField
          label={t('auth.signUp.country')}
          name="countryCode"
          value={form.countryCode}
          onChange={(e) => update('countryCode', e.target.value)}
          error={errors.countryCode}
        >
          <option value="">{t('auth.signUp.countryPlaceholder')}</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.names[locale] ?? c.names['en'] ?? c.code}
            </option>
          ))}
        </SelectField>
        <Checkbox
          name="acceptTerms"
          label={t('auth.signUp.acceptTerms')}
          checked={form.acceptTerms}
          onChange={(e) => update('acceptTerms', e.target.checked)}
          error={errors.acceptTerms}
        />
        <p className="-mt-2 text-sm text-muted">
          {t.rich('auth.signUp.readPolicies', {
            terms: (chunks) => (
              <Link
                href="/terms"
                target="_blank"
                className="font-semibold text-brand-text underline"
              >
                {chunks}
              </Link>
            ),
            privacy: (chunks) => (
              <Link
                href="/privacy"
                target="_blank"
                className="font-semibold text-brand-text underline"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
        {formError ? <Alert tone="error">{formError}</Alert> : null}
        <Button type="submit" loading={submitting}>
          {t('auth.signUp.submit')}
        </Button>
      </form>
      <p className="text-center text-muted">
        {t('auth.signUp.haveAccount')}{' '}
        <Link
          href="/login"
          className="font-semibold text-brand-text underline-offset-4 hover:underline"
        >
          {t('nav.logIn')}
        </Link>
      </p>
    </AuthCard>
  );
}
