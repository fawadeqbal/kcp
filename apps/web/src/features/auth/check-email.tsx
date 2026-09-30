'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Alert, AuthCard, Button } from '@/components/ui';
import { api } from '@/lib/api';
import { isolate, readPendingEmail } from './validation';

export function CheckEmail() {
  const t = useTranslations('auth.checkEmail');
  const [email, setEmail] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => setEmail(readPendingEmail()), []);

  async function resend() {
    if (!email) return;
    setSending(true);
    try {
      await api.POST('/v1/auth/email/resend', { body: { email } });
    } finally {
      setSending(false);
      setResent(true);
    }
  }

  return (
    <AuthCard title={t('title')}>
      <p>{email ? t('body', { email: isolate(email) }) : t('bodyNoEmail')}</p>
      <p className="text-muted">{t('spamHint')}</p>
      {resent ? <Alert tone="success">{t('resent')}</Alert> : null}
      {email ? (
        <Button variant="secondary" onClick={resend} loading={sending}>
          {t('resend')}
        </Button>
      ) : null}
    </AuthCard>
  );
}
