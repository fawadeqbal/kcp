'use client';

import type { components } from '@kcp/api-client-ts';
import { type AvatarKey, type ChildConsent, mayBeUnder13 } from '@kcp/shared';
import { useLocale, useTranslations } from 'next-intl';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AvatarPicker,
  Button,
  buttonClass,
  Card,
  PageSpinner,
  PasswordField,
  SelectField,
  TextField,
} from '@/components/ui';
import { Link, useRouter } from '@/i18n/navigation';
import { api, errorCode } from '@/lib/api';
import { errorMessageKey, isNicknameError } from '@/lib/errors';
import { useAccount } from '@/lib/use-account';
import { CHILD_PASSWORD_MIN_LENGTH, isNickname, isolate } from '../auth/validation';
import { useAvatarLabels } from './avatar-labels';
import { ConsentSwitches, type Consents, NO_CONSENTS } from './consent-switches';
import { LoginCard } from './login-card';
import { localName, useCountries, useLanguages, useRegions } from './reference-data';

type Child = components['schemas']['ChildDto'];
type Rules = components['schemas']['ChildRulesDto'];
type Field = 'nickname' | 'birthYear' | 'countryCode' | 'password';

interface FormState {
  nickname: string;
  avatarKey: AvatarKey;
  birthYear: string;
  countryCode: string;
  regionId: string;
  cityId: string;
  languageCode: string;
  password: string;
  consents: Consents;
}

export function AddChildForm() {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const parent = useAccount('PARENT');
  const avatarLabels = useAvatarLabels();
  const countries = useCountries();
  const languages = useLanguages();

  const [rules, setRules] = useState<Rules | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>({
    nickname: '',
    avatarKey: 'rocket',
    birthYear: '',
    countryCode: '',
    regionId: '',
    cityId: '',
    languageCode: locale,
    password: '',
    consents: NO_CONSENTS,
  });
  const regions = useRegions(form.countryCode);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<Child | null>(null);

  const loadSuggestions = useCallback(async () => {
    const { data } = await api.GET('/v1/children/nickname-suggestions');
    setSuggestions(data?.suggestions ?? []);
  }, []);

  useEffect(() => {
    if (!parent) return;
    void api.GET('/v1/children/rules').then(({ data }) => setRules(data ?? null));
    void loadSuggestions();
    // Most children live in the parent's country.
    setForm((f) => (f.countryCode ? f : { ...f, countryCode: parent.countryCode ?? '' }));
  }, [parent, loadSuggestions]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function validate() {
    const next: Partial<Record<Field, string>> = {};
    if (!isNickname(form.nickname)) next.nickname = t('validation.nickname');
    if (!form.birthYear) next.birthYear = t('validation.required');
    if (!form.countryCode) next.countryCode = t('validation.required');
    if (form.password.length < CHILD_PASSWORD_MIN_LENGTH) {
      next.password = t('validation.passwordLength', { min: CHILD_PASSWORD_MIN_LENGTH });
    }
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
      const { data, error } = await api.POST('/v1/children', {
        body: {
          nickname: form.nickname.trim(),
          avatarKey: form.avatarKey,
          birthYear: Number(form.birthYear),
          countryCode: form.countryCode,
          regionId: form.regionId || undefined,
          cityId: form.cityId || undefined,
          languageCode: form.languageCode,
          password: form.password,
          consents: mayBeUnder13(Number(form.birthYear), new Date().getUTCFullYear())
            ? NO_CONSENTS
            : form.consents,
        },
      });
      if (data?.status === 'PENDING_CONSENT') {
        // Under 13: the parent confirms their consent next.
        router.push(`/children/${data.id}/consent`);
        return;
      }
      if (data) {
        setCreated(data);
        window.scrollTo({ top: 0 });
        return;
      }
      const code = errorCode(error);
      const message = t(`errors.${errorMessageKey(code)}`);
      if (isNicknameError(code)) setErrors({ nickname: message });
      else if (code === 'BIRTH_YEAR_NOT_ALLOWED') setErrors({ birthYear: message });
      else setFormError(message);
    } catch {
      setFormError(t('errors.network'));
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setCreated(null);
    setForm((f) => ({ ...f, nickname: '', birthYear: '', password: '', consents: NO_CONSENTS }));
    void loadSuggestions();
  }

  if (!parent || !rules) return <PageSpinner />;

  if (created) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="print-hidden">
          <h1 className="text-4xl">
            {t('addChild.createdTitle', { nickname: isolate(created.nickname) })}
          </h1>
          <p className="mt-2 text-muted">{t('addChild.createdBody')}</p>
        </div>
        <LoginCard child={created} />
        <div className="print-hidden flex flex-wrap gap-3">
          <Button onClick={() => window.print()}>{t('addChild.print')}</Button>
          <Button variant="secondary" onClick={reset}>
            {t('addChild.addAnother')}
          </Button>
          <Link href="/dashboard" className={buttonClass('ghost')}>
            {t('addChild.backToDashboard')}
          </Link>
        </div>
      </div>
    );
  }

  const region = regions.find((r) => r.id === form.regionId);
  // Under 13: sharing stays off until the parent's consent is verified (next step).
  const young =
    form.birthYear !== '' && mayBeUnder13(Number(form.birthYear), new Date().getUTCFullYear());
  const setConsent = (consent: ChildConsent, on: boolean) =>
    update('consents', { ...form.consents, [consent]: on });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-4xl">{t('addChild.title')}</h1>
        <p className="mt-2 text-muted">{t('addChild.subtitle')}</p>
      </div>
      <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
        <Card>
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-3">
              <TextField
                label={t('addChild.nickname')}
                hint={t('addChild.nicknameHint')}
                name="nickname"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                dir="ltr"
                className="font-latin"
                maxLength={20}
                value={form.nickname}
                onChange={(e) => update('nickname', e.target.value)}
                error={errors.nickname}
              />
              <div
                role="group"
                aria-labelledby="nickname-ideas"
                className="flex flex-wrap items-center gap-2"
              >
                <span id="nickname-ideas" className="text-sm font-medium text-muted">
                  {t('addChild.ideas')}
                </span>
                {suggestions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={form.nickname === name}
                    onClick={() => update('nickname', name)}
                    className="font-latin rounded-full border border-line px-3 py-1 text-sm hover:bg-ink/7 aria-pressed:border-primary aria-pressed:bg-brand-100"
                    dir="ltr"
                  >
                    {name}
                  </button>
                ))}
                <Button variant="ghost" size="sm" onClick={() => void loadSuggestions()}>
                  {t('addChild.moreIdeas')}
                </Button>
              </div>
            </div>
            <AvatarPicker
              legend={t('addChild.avatar')}
              value={form.avatarKey}
              onChange={(key) => update('avatarKey', key)}
              labels={avatarLabels}
            />
          </div>
        </Card>

        <Card>
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField
              label={t('addChild.birthYear')}
              hint={rules.under13Open ? t('addChild.birthYearHint') : t('addChild.under13Closed')}
              name="birthYear"
              value={form.birthYear}
              onChange={(e) => update('birthYear', e.target.value)}
              error={errors.birthYear}
            >
              <option value="">{t('addChild.birthYearPlaceholder')}</option>
              {rules.birthYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </SelectField>
            <SelectField
              label={t('addChild.language')}
              name="languageCode"
              value={form.languageCode}
              onChange={(e) => update('languageCode', e.target.value)}
            >
              {languages.map((language) => (
                <option key={language.code} value={language.code} lang={language.code}>
                  {language.nativeName}
                </option>
              ))}
            </SelectField>
          </div>
        </Card>

        <Card title={t('addChild.locationTitle')}>
          <div className="flex flex-col gap-5">
            <SelectField
              label={t('addChild.country')}
              name="countryCode"
              value={form.countryCode}
              onChange={(e) =>
                setForm((f) => ({ ...f, countryCode: e.target.value, regionId: '', cityId: '' }))
              }
              error={errors.countryCode}
            >
              <option value="">{t('auth.signUp.countryPlaceholder')}</option>
              {countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {localName(country.names, locale)}
                </option>
              ))}
            </SelectField>
            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField
                label={t('addChild.region')}
                name="regionId"
                value={form.regionId}
                disabled={!regions.length}
                onChange={(e) => setForm((f) => ({ ...f, regionId: e.target.value, cityId: '' }))}
              >
                <option value="">{t('addChild.notSpecified')}</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {localName(r.names, locale)}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label={t('addChild.city')}
                name="cityId"
                value={form.cityId}
                disabled={!region?.cities.length}
                onChange={(e) => update('cityId', e.target.value)}
              >
                <option value="">{t('addChild.notSpecified')}</option>
                {region?.cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {localName(c.names, locale)}
                  </option>
                ))}
              </SelectField>
            </div>
            <p className="text-sm text-muted">{t('addChild.locationHint')}</p>
          </div>
        </Card>

        <Card>
          <PasswordField
            label={t('addChild.password')}
            hint={t('addChild.passwordHint', { min: CHILD_PASSWORD_MIN_LENGTH })}
            name="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            error={errors.password}
          />
        </Card>

        {young ? (
          <Alert>
            {t('consent.under13Note', { nickname: isolate(form.nickname.trim() || '…') })}{' '}
            {t('consent.under13Next')}
          </Alert>
        ) : (
          <Card title={t('addChild.sharingTitle')}>
            <p className="-mt-2 mb-4 text-sm text-muted">{t('addChild.sharingHint')}</p>
            <ConsentSwitches value={form.consents} onChange={setConsent} />
          </Card>
        )}

        <p className="text-sm text-muted">{t('addChild.consentNote')}</p>
        {formError ? <Alert tone="error">{formError}</Alert> : null}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={submitting}>
            {t('addChild.submit')}
          </Button>
          <Link href="/dashboard" className={buttonClass('secondary')}>
            {t('addChild.cancel')}
          </Link>
        </div>
      </form>
    </div>
  );
}
