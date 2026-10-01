'use client';

import type { components } from '@kcp/api-client-ts';
import { CONSENT_FORM_MAX_BYTES, CONSENT_FORM_TYPES, TERMS_VERSION } from '@kcp/shared';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { type FormEvent, useCallback, useEffect, useId, useState } from 'react';
import {
  Alert,
  AuthCard,
  Button,
  buttonClass,
  Card,
  Icon,
  IconBubble,
  PageSpinner,
} from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { api, errorCode } from '@/lib/api';
import { errorMessageKey } from '@/lib/errors';
import { useAccount } from '@/lib/use-account';
import { isolate } from '../auth/validation';
import { LoginCard } from './login-card';
import { PicturePasswordSection } from './picture-password';

type Child = components['schemas']['ChildDto'];
type Status = components['schemas']['ParentalConsentStatusDto'];
type Method = Status['methods'][number];

const ICONS = { CARD_CHECK: 'card', EMAIL_PLUS: 'mail', SIGNED_FORM: 'pencil' } as const;

/**
 * A parent's consent for a child under 13: the ways their country accepts, and what
 * happens next. Once it's verified: how the child signs in, and easier sign-in for
 * younger children (a picture password, or signing their tablet in from a phone).
 */
export function ParentalConsentPage({ childId }: { childId: string }) {
  const t = useTranslations();
  const format = useFormatter();
  const parent = useAccount('PARENT');
  const card = useSearchParams().get('card');
  const [child, setChild] = useState<Child | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    const [childResult, statusResult] = await Promise.all([
      api.GET('/v1/children/{id}', { params: { path: { id: childId } } }),
      api.GET('/v1/children/{id}/parental-consent', { params: { path: { id: childId } } }),
    ]);
    if (childResult.data && statusResult.data) {
      setChild(childResult.data);
      setStatus(statusResult.data);
    } else {
      setFailed(true);
    }
    return childResult.data ?? null;
  }, [childId]);

  useEffect(() => {
    if (parent) void load();
  }, [parent, load]);

  // Back from the card check: the bank's answer arrives by webhook, in a few seconds.
  useEffect(() => {
    if (card !== 'done' || !child || child.status !== 'PENDING_CONSENT') return;
    let tries = 0;
    const timer = setInterval(async () => {
      tries += 1;
      const fresh = await load();
      if (fresh?.status !== 'PENDING_CONSENT' || tries > 30) clearInterval(timer);
    }, 2000);
    return () => clearInterval(timer);
  }, [card, child, load]);

  if (failed) return <Alert tone="error">{t('errors.generic')}</Alert>;
  if (!parent || !child || !status) return <PageSpinner />;
  const nickname = isolate(child.nickname);

  if (child.status !== 'PENDING_CONSENT') {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="print-hidden">
          <h1 className="text-4xl">{t('consent.readyTitle', { nickname })}</h1>
          <p className="mt-2 text-muted">{t('consent.readyBody', { nickname })}</p>
        </div>
        <LoginCard child={child} />
        <div className="print-hidden flex flex-wrap gap-3">
          <Button onClick={() => window.print()}>{t('addChild.print')}</Button>
          <Link href="/dashboard" className={buttonClass('secondary')}>
            {t('consent.back')}
          </Link>
        </div>
        <Card title={t('consent.easierTitle')} className="print-hidden">
          <p className="-mt-2 mb-4 text-muted">{t('consent.easierBody', { nickname })}</p>
          <PicturePasswordSection child={child} onChange={setChild} />
          <Link
            href="/pair"
            className="mt-5 flex items-center gap-3.5 rounded-row bg-raised px-4.5 py-3.5 font-bold transition-colors hover:bg-ink/7"
          >
            <IconBubble icon="laptop" tone="neutral" size="sm" />
            <span className="flex-1">{t('pair.dashboardLink')}</span>
            <Icon name="arrow" className="text-lg text-muted" />
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header>
        <h1 className="text-4xl">{t('consent.title', { nickname })}</h1>
        <p className="mt-2 text-lg">{t('consent.intro', { nickname })}</p>
        <p className="mt-2 text-muted">{t('consent.whatWeKeep')}</p>
        {status.deleteAfter ? (
          <p className="mt-2 text-sm text-muted">
            {t('consent.deleteAfter', {
              date: format.dateTime(new Date(status.deleteAfter), { dateStyle: 'long' }),
            })}
          </p>
        ) : null}
      </header>
      {card === 'canceled' ? <Alert tone="warning">{t('consent.cardCanceled')}</Alert> : null}
      {card === 'done' ? <Alert>{t('consent.cardWaiting')}</Alert> : null}
      {status.status === 'SUBMITTED' ? (
        <Alert tone="success">{t('consent.submitted')}</Alert>
      ) : (
        <>
          {status.status === 'REJECTED' && status.rejectReason ? (
            <Alert tone="warning">{t('consent.rejected', { reason: status.rejectReason })}</Alert>
          ) : null}
          {status.methods.map((method) => (
            <MethodCard
              key={method}
              method={method}
              child={child}
              cardsAvailable={status.cardsAvailable}
              onChange={() => void load()}
            />
          ))}
        </>
      )}
      <Link href="/dashboard" className="self-start font-semibold text-brand-text hover:underline">
        {t('consent.back')}
      </Link>
    </div>
  );
}

function MethodCard({
  method,
  child,
  cardsAvailable,
  onChange,
}: {
  method: Method;
  child: Child;
  cardsAvailable: boolean;
  onChange: () => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const fileId = useId();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const titles = {
    CARD_CHECK: t('consent.cardTitle'),
    EMAIL_PLUS: t('consent.emailTitle'),
    SIGNED_FORM: t('consent.formTitle'),
  };
  const bodies = {
    CARD_CHECK: t('consent.cardBody'),
    EMAIL_PLUS: t('consent.emailBody'),
    SIGNED_FORM: t('consent.formBody'),
  };
  const fail = (code: string | undefined) =>
    setMessage({ tone: 'error', text: t(`errors.${errorMessageKey(code)}`) });

  async function start() {
    setBusy(true);
    setMessage(null);
    try {
      const { data, error } = await api.POST('/v1/children/{id}/parental-consent', {
        params: { path: { id: child.id } },
        body: { method, locale },
      });
      if (!data) return fail(errorCode(error));
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      if (data.emailSent) setMessage({ tone: 'success', text: t('consent.emailSent') });
    } catch {
      setMessage({ tone: 'error', text: t('errors.network') });
    } finally {
      setBusy(false);
    }
  }

  async function upload(event: FormEvent) {
    event.preventDefault();
    if (!file) return fail('CONSENT_FORM_MISSING');
    if (file.size > CONSENT_FORM_MAX_BYTES) return fail('CONSENT_FORM_TOO_BIG');
    setBusy(true);
    setMessage(null);
    try {
      // The file itself is the body; the API checks what it really is.
      const { data, error } = await api.POST('/v1/children/{id}/parental-consent/form', {
        params: { path: { id: child.id } },
        body: file as unknown as string,
        bodySerializer: (body: unknown) => body as Blob,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      });
      if (!data) return fail(errorCode(error));
      onChange();
    } catch {
      setMessage({ tone: 'error', text: t('errors.network') });
    } finally {
      setBusy(false);
    }
  }

  const unavailable = method === 'CARD_CHECK' && !cardsAvailable;
  return (
    <Card>
      <div className="flex items-start gap-4">
        <IconBubble icon={ICONS[method]} tone="brand" />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <h2 className="text-2xl">{titles[method]}</h2>
          <p className="text-muted">{bodies[method]}</p>
          {method === 'SIGNED_FORM' ? (
            <form className="flex flex-col gap-3" onSubmit={upload} noValidate>
              <Link
                href={`/children/${child.id}/consent/form`}
                className={buttonClass('secondary', 'md')}
              >
                <Icon name="printer" />
                {t('consent.formOpen')}
              </Link>
              <label htmlFor={fileId} className="text-sm font-bold">
                {t('consent.formFile')}
              </label>
              <input
                id={fileId}
                type="file"
                accept={CONSENT_FORM_TYPES.join(',')}
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="text-sm file:me-3 file:rounded-full file:border-0 file:bg-raised file:px-4 file:py-2 file:font-bold"
              />
              <Button type="submit" loading={busy} className="self-start">
                {t('consent.formSend')}
              </Button>
            </form>
          ) : unavailable ? (
            <p className="text-sm text-muted">{t('consent.cardUnavailable')}</p>
          ) : (
            <Button onClick={() => void start()} loading={busy} className="self-start">
              {method === 'CARD_CHECK' ? t('consent.cardButton') : t('consent.emailButton')}
            </Button>
          )}
          <div aria-live="polite">
            {message ? (
              <Alert tone={message.tone} live={false}>
                {message.text}
              </Alert>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}

/** The consent form to print, sign and send back (the signed form method). */
export function ConsentFormPrint({ childId }: { childId: string }) {
  const t = useTranslations();
  const parent = useAccount('PARENT');
  const [child, setChild] = useState<Child | null>(null);
  useEffect(() => {
    if (!parent) return;
    void api
      .GET('/v1/children/{id}', { params: { path: { id: childId } } })
      .then(({ data }) => data && setChild(data));
  }, [parent, childId]);
  if (!parent || !child) return <PageSpinner />;
  const line = 'mt-1 h-10 border-b-2 border-ink/40';
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 bg-surface p-8 print:bg-white print:p-0">
      <h1 className="text-3xl">{t('consent.formPageTitle')}</h1>
      <p className="text-lg">{t('consent.formStatement')}</p>
      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm font-bold text-muted">{t('consent.formChild')}</dt>
          <dd className="text-xl font-bold">
            <bdi>{child.nickname}</bdi>
          </dd>
        </div>
        <div>
          <dt className="text-sm font-bold text-muted">{t('consent.formBirthYear')}</dt>
          <dd className="text-xl font-bold">{child.birthYear}</dd>
        </div>
      </dl>
      {(['formParentName', 'formSignature', 'formDate'] as const).map((key) => (
        <div key={key}>
          <p className="text-sm font-bold text-muted">{t(`consent.${key}`)}</p>
          <div className={line} />
        </div>
      ))}
      <p className="text-sm text-muted">{t('consent.formWhat')}</p>
      <p className="text-xs text-muted">{t('consent.formVersion', { version: TERMS_VERSION })}</p>
      <div className="print-hidden flex flex-wrap gap-3">
        <Button onClick={() => window.print()}>
          <Icon name="printer" />
          {t('consent.print')}
        </Button>
        <Link href={`/children/${child.id}/consent`} className={buttonClass('secondary')}>
          {t('consent.back')}
        </Link>
      </div>
    </div>
  );
}

// The link works once; React may run effects twice in development.
const confirmations = new Map<string, Promise<string | null>>();

/** The link in the "email plus" email: confirms the consent (no sign-in needed). */
export function ConsentConfirm() {
  const t = useTranslations();
  const token = useSearchParams().get('token');
  const [state, setState] = useState<{ nickname: string } | 'working' | 'failed'>(
    token ? 'working' : 'failed',
  );
  useEffect(() => {
    if (!token) return;
    let attempt = confirmations.get(token);
    if (!attempt) {
      attempt = api
        .POST('/v1/parental-consent/confirm', { body: { token } })
        .then(({ data }) => data?.nickname ?? null)
        .catch(() => null);
      confirmations.set(token, attempt);
    }
    void attempt.then((nickname) => setState(nickname ? { nickname } : 'failed'));
  }, [token]);
  return (
    <AuthCard
      title={typeof state === 'object' ? t('consent.confirmedTitle') : t('consent.confirmTitle')}
    >
      {state === 'working' ? <p aria-live="polite">{t('consent.confirming')}</p> : null}
      {typeof state === 'object' ? (
        <Alert tone="success">
          {t('consent.confirmedBody', { nickname: isolate(state.nickname) })}
        </Alert>
      ) : null}
      {state === 'failed' ? <Alert tone="error">{t('consent.confirmFailed')}</Alert> : null}
      {state !== 'working' ? (
        <Link href="/dashboard" className={buttonClass('primary')}>
          {t('consent.openDashboard')}
        </Link>
      ) : null}
    </AuthCard>
  );
}
