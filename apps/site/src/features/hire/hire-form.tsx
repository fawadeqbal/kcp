'use client';

import { Alert, Button, SelectField, TextField, textareaClass } from '@kcp/ui';
import { clsx } from 'clsx';
import { useLocale, useTranslations } from 'next-intl';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { COUNTRY_CODES, COUNTRY_NAMES } from '@/lib/countries';
import { isolate } from '@/lib/format';
import { BUDGETS, type Budget, type SendResult, sendHireRequest } from './api';

type Field = 'contactName' | 'contactEmail' | 'company' | 'title' | 'brief';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * "Hire our students": a business describes a project. The API emails a link to confirm
 * the address; only then does the request reach our team.
 */
export function HireForm() {
  const t = useTranslations('hire.form');
  const locale = useLocale() as 'en';
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<Exclude<SendResult, 'sent'> | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const success = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sentTo) success.current?.focus();
  }, [sentTo]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const value = (name: string) => String(data.get(name) ?? '').trim();
    const found: Partial<Record<Field, string>> = {};
    if (value('contactName').length < 2) found.contactName = t('errors.name');
    if (!EMAIL.test(value('contactEmail'))) found.contactEmail = t('errors.email');
    if (value('company').length < 2) found.company = t('errors.company');
    if (value('title').length < 3) found.title = t('errors.title');
    if (value('brief').length < 30) found.brief = t('errors.brief');
    setErrors(found);
    setProblem(null);
    const first = (Object.keys(found) as Field[])[0];
    if (first) {
      form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setSending(true);
    const result = await sendHireRequest({
      contactName: value('contactName'),
      contactEmail: value('contactEmail'),
      company: value('company'),
      ...(value('countryCode') ? { countryCode: value('countryCode') } : {}),
      languageCode: locale,
      title: value('title'),
      brief: value('brief'),
      budget: (value('budget') || 'UNSURE') as Budget,
      ...(value('deadline') ? { deadline: value('deadline') } : {}),
      website: value('website'),
    });
    setSending(false);
    if (result === 'sent') setSentTo(value('contactEmail'));
    else setProblem(result);
  }

  if (sentTo) {
    return (
      <div ref={success} tabIndex={-1} className="rounded-row">
        <Alert tone="success">
          <p className="text-lg font-bold">{t('sentTitle')}</p>
          <p className="mt-1 text-ink">{t('sent', { email: isolate(sentTo) })}</p>
        </Alert>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label={t('name')}
          name="contactName"
          autoComplete="name"
          maxLength={100}
          error={errors.contactName}
        />
        <TextField
          label={t('email')}
          name="contactEmail"
          type="email"
          dir="ltr"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          maxLength={254}
          error={errors.contactEmail}
        />
        <TextField
          label={t('company')}
          name="company"
          autoComplete="organization"
          maxLength={120}
          error={errors.company}
        />
        <SelectField label={t('country')} name="countryCode" defaultValue="">
          <option value="">{t('otherCountry')}</option>
          {COUNTRY_CODES.map((code) => (
            <option key={code} value={code}>
              {COUNTRY_NAMES[code][locale]}
            </option>
          ))}
        </SelectField>
      </div>
      <TextField label={t('title')} name="title" maxLength={120} error={errors.title} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="hire-brief" className="text-sm font-semibold">
          {t('brief')}
        </label>
        <textarea
          id="hire-brief"
          name="brief"
          maxLength={5000}
          aria-invalid={errors.brief ? true : undefined}
          aria-describedby={errors.brief ? 'hire-brief-error' : 'hire-brief-hint'}
          className={clsx(textareaClass(errors.brief), 'min-h-36')}
        />
        {errors.brief ? (
          <p id="hire-brief-error" role="alert" className="text-sm font-semibold text-danger">
            {errors.brief}
          </p>
        ) : (
          <p id="hire-brief-hint" className="text-sm text-muted">
            {t('briefHint')}
          </p>
        )}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField label={t('budget')} name="budget" defaultValue="FROM_500">
          {BUDGETS.map((budget) => (
            <option key={budget} value={budget}>
              {t(`budgets.${budget}`)}
            </option>
          ))}
        </SelectField>
        <TextField label={t('deadline')} name="deadline" type="date" />
      </div>
      {/* For bots only: people never see or fill it. */}
      <div aria-hidden="true" className="absolute -start-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div aria-live="polite">
        {problem ? <Alert tone="error">{t(`problems.${problem}`)}</Alert> : null}
      </div>
      <Button type="submit" loading={sending} className="self-start">
        {t('send')}
      </Button>
      <p className="text-sm text-muted">{t('privacy')}</p>
    </form>
  );
}
