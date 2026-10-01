'use client';

import type { components } from '@kcp/api-client-ts';
import { normalizePairingCode, PAIRING_CODE_LENGTH } from '@kcp/shared';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';
import { Alert, Avatar, Button, Card, PageSpinner, TextField } from '@/components/ui';
import { api, errorCode } from '@/lib/api';
import { errorMessageKey } from '@/lib/errors';
import { useAccount } from '@/lib/use-account';
import { isolate } from '../auth/validation';

type Child = components['schemas']['ChildDto'];
type Info = components['schemas']['PairingInfoDto'];

/**
 * "Sign in your child's device": the parent types (or scans) the code the child's
 * device shows, sees which device asked, and picks the child who uses it.
 */
export function PairDevice() {
  const t = useTranslations();
  const parent = useAccount('PARENT');
  const initial = useSearchParams().get('code') ?? '';
  const [code, setCode] = useState(initial);
  const [info, setInfo] = useState<Info | null>(null);
  const [children, setChildren] = useState<Child[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Child | null>(null);

  useEffect(() => {
    if (!parent) return;
    void api.GET('/v1/children').then(({ data }) => setChildren(data ?? []));
  }, [parent]);

  async function lookup(value: string) {
    setError(null);
    setBusy(true);
    try {
      const { data, error: apiError } = await api.POST('/v1/auth/pairing/lookup', {
        body: { code: value },
      });
      if (data) setInfo(data);
      else setError(t(`errors.${errorMessageKey(errorCode(apiError))}`));
    } catch {
      setError(t('errors.network'));
    } finally {
      setBusy(false);
    }
  }

  // A scanned QR code brings the code with it.
  useEffect(() => {
    if (parent && normalizePairingCode(initial).length === PAIRING_CODE_LENGTH)
      void lookup(initial);
    // oxlint-disable-next-line exhaustive-deps -- once, for the code in the link
  }, [parent]);

  async function approve(child: Child) {
    setError(null);
    setBusy(true);
    try {
      const { response, error: apiError } = await api.POST('/v1/auth/pairing/approve', {
        body: { code, childId: child.id },
      });
      if (response.ok) setDone(child);
      else setError(t(`errors.${errorMessageKey(errorCode(apiError))}`));
    } catch {
      setError(t('errors.network'));
    } finally {
      setBusy(false);
    }
  }

  if (!parent || !children) return <PageSpinner />;
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 className="text-4xl">{t('pair.title')}</h1>
      {done ? (
        <Alert tone="success">{t('pair.done', { nickname: isolate(done.nickname) })}</Alert>
      ) : info ? (
        <Card>
          <p className="font-bold">{t('pair.device', { device: info.device })}</p>
          <p className="mt-1 text-sm text-muted">{t('pair.warning')}</p>
          <h2 className="mt-5 mb-3 text-xl">{t('pair.who')}</h2>
          {children.length === 0 ? <p>{t('pair.noChildren')}</p> : null}
          <ul className="flex flex-col gap-2.5">
            {children.map((child) => (
              <li key={child.id}>
                <Button
                  variant="secondary"
                  className="w-full justify-start"
                  onClick={() => void approve(child)}
                  disabled={busy}
                >
                  <Avatar avatarKey={child.avatarKey} size="sm" />
                  {t('pair.approve', { nickname: isolate(child.nickname) })}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            void lookup(code);
          }}
          noValidate
        >
          <TextField
            label={t('pair.codeLabel')}
            name="code"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            dir="ltr"
            className="font-latin text-2xl tracking-widest"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Button type="submit" loading={busy} className="self-start">
            {t('pair.find')}
          </Button>
        </form>
      )}
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}
