'use client';

import { ADULT_PASSWORD_MIN_LENGTH } from '@kcp/shared';
import { useTranslations } from 'next-intl';
import { type FormEvent, useState } from 'react';
import { Alert, Button, Card, Dialog, PageSpinner, PasswordField } from '@/components/ui';
import { api, errorCode } from '@/lib/api';
import { useAuth } from '@/lib/auth-provider';
import { errorMessageKey } from '@/lib/errors';
import { useAccount } from '@/lib/use-account';

/** A parent's password, a copy of the family's data, and deleting the account. */
export function AccountPage() {
  const t = useTranslations('account');
  const user = useAccount('ADULT');
  const [deleted, setDeleted] = useState(false);
  if (deleted) {
    return (
      <div className="mx-auto max-w-3xl">
        <Alert tone="success">{t('deleted')}</Alert>
      </div>
    );
  }
  if (!user) return <PageSpinner />;
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-4xl">{t('title')}</h1>
        <p className="mt-2 text-muted">{t('intro')}</p>
      </div>
      <ChangePassword />
      <DownloadData />
      <DeleteAccount onDeleted={() => setDeleted(true)} />
    </div>
  );
}

function ChangePassword() {
  const t = useTranslations();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [errors, setErrors] = useState<{ current?: string; next?: string; form?: string }>({});
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setDone(false);
    const problems: typeof errors = {};
    if (!current) problems.current = t('validation.required');
    if (next.length < ADULT_PASSWORD_MIN_LENGTH) {
      problems.next = t('validation.passwordLength', { min: ADULT_PASSWORD_MIN_LENGTH });
    }
    setErrors(problems);
    if (problems.current || problems.next) return;
    setBusy(true);
    try {
      const { response, error } = await api.POST('/v1/auth/password/change', {
        body: { currentPassword: current, newPassword: next },
      });
      if (response.ok) {
        setDone(true);
        setCurrent('');
        setNext('');
        return;
      }
      const code = errorCode(error);
      const message = t(`errors.${errorMessageKey(code)}`);
      setErrors(
        code === 'WRONG_PASSWORD'
          ? { current: message }
          : code === 'PASSWORD_TOO_WEAK'
            ? { next: message }
            : { form: message },
      );
    } catch {
      setErrors({ form: t('errors.network') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title={t('account.passwordTitle')}>
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <p className="text-muted">{t('account.passwordBody')}</p>
        <PasswordField
          label={t('account.currentPassword')}
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          error={errors.current}
        />
        <PasswordField
          label={t('account.newPassword')}
          hint={t('auth.passwordHint')}
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          error={errors.next}
        />
        {errors.form ? <Alert tone="error">{errors.form}</Alert> : null}
        {done ? <Alert tone="success">{t('account.passwordChanged')}</Alert> : null}
        <div>
          <Button type="submit" loading={busy}>
            {t('account.passwordSubmit')}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function DownloadData() {
  const t = useTranslations('account');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function download() {
    setBusy(true);
    setFailed(false);
    try {
      const { data } = await api.GET('/v1/account/export', { parseAs: 'blob' });
      if (!(data instanceof Blob)) throw new Error('No file');
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'kids-coding-platform-data.json';
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title={t('exportTitle')}>
      <p className="text-muted">{t('exportBody')}</p>
      {failed ? (
        <div className="mt-3">
          <Alert tone="error">{t('exportFailed')}</Alert>
        </div>
      ) : null}
      <Button variant="secondary" className="mt-4" loading={busy} onClick={() => void download()}>
        {t('exportButton')}
      </Button>
    </Card>
  );
}

function DeleteAccount({ onDeleted }: { onDeleted: () => void }) {
  const t = useTranslations();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  function close() {
    setOpen(false);
    setPassword('');
    setError(undefined);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!password) {
      setError(t('validation.required'));
      return;
    }
    setBusy(true);
    try {
      const { response, error: apiError } = await api.DELETE('/v1/account', {
        body: { password },
      });
      if (response.ok) {
        onDeleted();
        // The session is gone already; this clears it in the browser too.
        await logout().catch(() => undefined);
        return;
      }
      setError(t(`errors.${errorMessageKey(errorCode(apiError))}`));
    } catch {
      setError(t('errors.network'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title={t('account.deleteTitle')} className="border-transparent">
      <p className="text-muted">{t('account.deleteBody')}</p>
      <Button variant="danger" className="mt-4" onClick={() => setOpen(true)}>
        {t('account.deleteButton')}
      </Button>
      <Dialog open={open} onClose={close} title={t('account.deleteDialogTitle')}>
        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <Alert tone="warning">{t('account.deleteBody')}</Alert>
          <PasswordField
            label={t('account.deletePassword')}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error}
          />
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={close}>
              {t('account.cancel')}
            </Button>
            <Button type="submit" variant="danger" loading={busy}>
              {t('account.deleteConfirm')}
            </Button>
          </div>
        </form>
      </Dialog>
    </Card>
  );
}
