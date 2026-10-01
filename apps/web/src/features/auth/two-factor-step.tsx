'use client';

import { useTranslations } from 'next-intl';
import QRCode from 'qrcode';
import { type FormEvent, useEffect, useState } from 'react';
import { Alert, AuthCard, Button, TextField } from '@/components/ui';
import { useRouter } from '@/i18n/navigation';
import { homePath, useAuth } from '@/lib/auth-provider';
import { errorMessageKey } from '@/lib/errors';

/**
 * The second login step for mentors and teachers: the first time, setting up an
 * authenticator app (QR code and key); then the 6-digit code every time.
 */
export function TwoFactorStep({
  stage,
  mfaToken,
  onStartOver,
}: {
  stage: 'setup' | 'verify';
  mfaToken: string;
  onStartOver: () => void;
}) {
  const t = useTranslations();
  const router = useRouter();
  const { setupTwoFactor, verifyTwoFactor } = useAuth();
  const [secret, setSecret] = useState<{ secret: string; qr: string } | null>(null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string>();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (stage !== 'setup') return;
    let current = true;
    void (async () => {
      const result = await setupTwoFactor(mfaToken);
      if (!current) return;
      if ('secret' in result) {
        const qr = await QRCode.toDataURL(result.otpauthUrl, { margin: 1, width: 220 });
        if (current) setSecret({ secret: result.secret, qr });
      } else {
        setFormError(t(`errors.${errorMessageKey(result.code, result.code === 'network')}`));
      }
    })();
    return () => {
      current = false;
    };
  }, [stage, mfaToken, setupTwoFactor, t]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!/^\d{6}$/.test(code.trim())) {
      setCodeError(t('auth.twoFactor.codeInvalid'));
      return;
    }
    setCodeError(undefined);
    setSubmitting(true);
    const result = await verifyTwoFactor(mfaToken, code.trim());
    setSubmitting(false);
    if (result.ok) {
      router.replace(homePath(result.user));
      return;
    }
    setFormError(t(`errors.${errorMessageKey(result.code, result.network)}`));
  }

  const setup = stage === 'setup';
  return (
    <AuthCard
      title={t(setup ? 'auth.twoFactor.setupTitle' : 'auth.twoFactor.verifyTitle')}
      subtitle={t(setup ? 'auth.twoFactor.setupBody' : 'auth.twoFactor.verifyBody')}
    >
      <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
        {setup && secret ? (
          <div className="flex flex-col items-center gap-3">
            <img
              src={secret.qr}
              alt={t('auth.twoFactor.qrAlt')}
              width={220}
              height={220}
              className="rounded-row bg-white p-2"
            />
            <p className="text-center text-sm text-muted">
              {t('auth.twoFactor.secretLabel')}{' '}
              <code dir="ltr" data-testid="mfa-secret" className="font-mono break-all text-ink">
                {secret.secret.replace(/(.{4})/g, '$1 ').trim()}
              </code>
            </p>
          </div>
        ) : null}
        <TextField
          label={t('auth.twoFactor.codeLabel')}
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          dir="ltr"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          error={codeError}
        />
        {formError ? <Alert tone="error">{formError}</Alert> : null}
        <Button type="submit" size="lg" loading={submitting} disabled={setup && !secret}>
          {t(setup ? 'auth.twoFactor.setupSubmit' : 'auth.twoFactor.verifySubmit')}
        </Button>
        <button
          type="button"
          onClick={onStartOver}
          className="self-start rounded-full text-sm font-bold text-brand-text underline-offset-4 hover:underline"
        >
          {t('auth.twoFactor.startOver')}
        </button>
      </form>
    </AuthCard>
  );
}
