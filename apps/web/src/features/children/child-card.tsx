'use client';

import type { components } from '@kcp/api-client-ts';
import { type AvatarKey, type ChildConsent, isAvatarKey } from '@kcp/shared';
import { useFormatter, useTranslations } from 'next-intl';
import { type FormEvent, useId, useState } from 'react';
import {
  Alert,
  Avatar,
  AvatarPicker,
  Badge,
  Button,
  Card,
  Dialog,
  PasswordField,
  SelectField,
  TextField,
} from '@/components/ui';
import { api, errorCode } from '@/lib/api';
import { errorMessageKey, isNicknameError } from '@/lib/errors';
import { CHILD_PASSWORD_MIN_LENGTH, isNickname, isolate } from '../auth/validation';
import { useAvatarLabels } from './avatar-labels';
import { ChildCertificates } from '../certificates/child-certificates';
import { ConsentSwitches } from './consent-switches';
import { ProjectsSection } from './projects-section';
import { useLanguages } from './reference-data';

export type Child = components['schemas']['ChildDto'];

type Message = { tone: 'success' | 'error'; text: string } | null;

/** One child on the parent dashboard, with everything the parent can change. */
export function ChildCard({
  child,
  onChange,
  onDeleted,
}: {
  child: Child;
  onChange: (child: Child) => void;
  onDeleted: (child: Child) => void;
}) {
  const t = useTranslations('dashboard');
  const format = useFormatter();
  const [open, setOpen] = useState(false);
  const headingId = useId();
  const panelId = useId();

  return (
    <article
      aria-labelledby={headingId}
      className="rounded-[var(--radius-card)] border border-line bg-surface"
    >
      <div className="flex flex-wrap items-center gap-4 p-5">
        <Avatar avatarKey={child.avatarKey} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 id={headingId} className="font-latin text-xl font-bold">
            <bdi>{child.nickname}</bdi>
          </h3>
          <p className="font-latin text-muted">
            <bdi>{child.username}</bdi>
          </p>
          <p className="text-sm text-muted">
            {t('bornIn', { year: String(child.birthYear) })}
            {' · '}
            {child.lastLoginAt
              ? t('lastLogin', {
                  date: format.dateTime(new Date(child.lastLoginAt), { dateStyle: 'medium' }),
                })
              : t('neverLoggedIn')}
            {' · '}
            {t('lessonsDone', { count: String(child.lessonsCompleted) })}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="font-semibold text-brand-700">
              {t('level', { level: String(child.level) })}
            </span>
            <span>{t('xp', { xp: String(child.xpTotal) })}</span>
            <span>{t('streak', { count: String(child.streak) })}</span>
            <span>{t('badges', { count: String(child.badges) })}</span>
            <Badge tone={child.premiumSource ? 'success' : 'neutral'}>
              {child.premiumSource === 'subscription'
                ? t('premiumPlan')
                : child.premiumSource && child.premiumUntil
                  ? t(child.premiumSource === 'trial' ? 'premiumTrial' : 'premium', {
                      date: format.dateTime(new Date(child.premiumUntil), { dateStyle: 'medium' }),
                    })
                  : t('premiumNone')}
            </Badge>
          </p>
        </div>
        <Button
          variant="secondary"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? t('close') : t('manage')}
        </Button>
      </div>
      {open ? (
        <div id={panelId} className="flex flex-col gap-4 border-t border-line bg-canvas/60 p-5">
          <SharingSection child={child} onChange={onChange} />
          <ProjectsSection child={child} />
          <ChildCertificates childId={child.id} />
          <ProfileSection child={child} onChange={onChange} />
          <PasswordSection child={child} />
          <DeleteSection child={child} onDeleted={onDeleted} />
        </div>
      ) : null}
    </article>
  );
}

function StatusLine({ message }: { message: Message }) {
  // Always rendered, so screen readers announce changes to it.
  return (
    <p
      aria-live="polite"
      className={message?.tone === 'error' ? 'text-sm text-danger' : 'text-sm text-success'}
    >
      {message?.text}
    </p>
  );
}

function SharingSection({ child, onChange }: { child: Child; onChange: (child: Child) => void }) {
  const t = useTranslations();
  const [busy, setBusy] = useState<ChildConsent | null>(null);
  const [message, setMessage] = useState<Message>(null);

  async function toggle(consent: ChildConsent, on: boolean) {
    const previous = child;
    const consents = { ...child.consents, [consent]: on };
    onChange({ ...child, consents });
    setBusy(consent);
    setMessage(null);
    try {
      const { data, error } = await api.PUT('/v1/children/{id}/consents', {
        params: { path: { id: child.id } },
        body: consents,
      });
      if (data) {
        onChange(data);
        setMessage({ tone: 'success', text: t('dashboard.saved') });
      } else {
        onChange(previous);
        setMessage({ tone: 'error', text: t(`errors.${errorMessageKey(errorCode(error))}`) });
      }
    } catch {
      onChange(previous);
      setMessage({ tone: 'error', text: t('errors.network') });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card
      title={t('dashboard.sharingTitle', { nickname: isolate(child.nickname) })}
      headingLevel={3}
    >
      <ConsentSwitches value={child.consents} onChange={toggle} busy={busy} />
      <div className="mt-3">
        <StatusLine message={message} />
      </div>
    </Card>
  );
}

function ProfileSection({ child, onChange }: { child: Child; onChange: (child: Child) => void }) {
  const t = useTranslations();
  const avatarLabels = useAvatarLabels();
  const languages = useLanguages();
  const [nickname, setNickname] = useState(child.nickname);
  const [avatarKey, setAvatarKey] = useState<AvatarKey>(
    isAvatarKey(child.avatarKey) ? child.avatarKey : 'rocket',
  );
  const [languageCode, setLanguageCode] = useState(child.languageCode);
  const [nicknameError, setNicknameError] = useState<string>();
  const [message, setMessage] = useState<Message>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (!isNickname(nickname)) {
      setNicknameError(t('validation.nickname'));
      return;
    }
    setNicknameError(undefined);
    setSaving(true);
    try {
      const { data, error } = await api.PATCH('/v1/children/{id}', {
        params: { path: { id: child.id } },
        body: {
          nickname: nickname.trim() === child.nickname ? undefined : nickname.trim(),
          avatarKey,
          languageCode,
        },
      });
      if (data) {
        onChange(data);
        setMessage({ tone: 'success', text: t('dashboard.profileSaved') });
        return;
      }
      const code = errorCode(error);
      const text = t(`errors.${errorMessageKey(code)}`);
      if (isNicknameError(code)) setNicknameError(text);
      else setMessage({ tone: 'error', text });
    } catch {
      setMessage({ tone: 'error', text: t('errors.network') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title={t('dashboard.profileTitle')} headingLevel={3}>
      <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label={t('addChild.nickname')}
            hint={t('addChild.nicknameHint')}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            dir="ltr"
            className="font-latin"
            maxLength={20}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            error={nicknameError}
          />
          <SelectField
            label={t('addChild.language')}
            value={languageCode}
            onChange={(e) => setLanguageCode(e.target.value)}
          >
            {languages.map((language) => (
              <option key={language.code} value={language.code} lang={language.code}>
                {language.nativeName}
              </option>
            ))}
          </SelectField>
        </div>
        <AvatarPicker
          legend={t('addChild.avatar')}
          name={`avatar-${child.id}`}
          value={avatarKey}
          onChange={setAvatarKey}
          labels={avatarLabels}
        />
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" variant="secondary" loading={saving}>
            {t('dashboard.profileSave')}
          </Button>
          <StatusLine message={message} />
        </div>
      </form>
    </Card>
  );
}

function PasswordSection({ child }: { child: Child }) {
  const t = useTranslations();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<Message>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (password.length < CHILD_PASSWORD_MIN_LENGTH) {
      setError(t('validation.passwordLength', { min: CHILD_PASSWORD_MIN_LENGTH }));
      return;
    }
    setError(undefined);
    setSaving(true);
    try {
      const { response, error: apiError } = await api.POST('/v1/children/{id}/password', {
        params: { path: { id: child.id } },
        body: { password },
      });
      if (response.ok) {
        setPassword('');
        setMessage({
          tone: 'success',
          text: t('dashboard.passwordChanged', { nickname: isolate(child.nickname) }),
        });
      } else {
        setMessage({ tone: 'error', text: t(`errors.${errorMessageKey(errorCode(apiError))}`) });
      }
    } catch {
      setMessage({ tone: 'error', text: t('errors.network') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title={t('dashboard.passwordTitle')} headingLevel={3}>
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <p className="text-muted">
          {t('dashboard.passwordBody', { nickname: isolate(child.nickname) })}
        </p>
        <PasswordField
          label={t('addChild.password')}
          hint={t('addChild.passwordHint', { min: CHILD_PASSWORD_MIN_LENGTH })}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error}
        />
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" variant="secondary" loading={saving}>
            {t('dashboard.passwordSubmit')}
          </Button>
          <StatusLine message={message} />
        </div>
      </form>
    </Card>
  );
}

function DeleteSection({ child, onDeleted }: { child: Child; onDeleted: (child: Child) => void }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const nickname = isolate(child.nickname);

  function close() {
    setOpen(false);
    setTyped('');
    setError(undefined);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (typed.trim().toLowerCase() !== child.nickname.toLowerCase()) {
      setError(t('validation.confirmMismatch'));
      return;
    }
    setDeleting(true);
    try {
      const { response, error: apiError } = await api.DELETE('/v1/children/{id}', {
        params: { path: { id: child.id } },
        body: { nickname: typed.trim() },
      });
      if (response.ok) {
        close();
        onDeleted(child);
      } else {
        setError(t(`errors.${errorMessageKey(errorCode(apiError))}`));
      }
    } catch {
      setError(t('errors.network'));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card title={t('dashboard.deleteTitle')} headingLevel={3} className="border-danger/30">
      <p className="text-muted">{t('dashboard.deleteBody', { nickname })}</p>
      <Button variant="danger" className="mt-4" onClick={() => setOpen(true)}>
        {t('dashboard.deleteButton')}
      </Button>
      <Dialog open={open} onClose={close} title={t('dashboard.deleteDialogTitle', { nickname })}>
        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <Alert tone="warning">{t('dashboard.deleteBody', { nickname })}</Alert>
          <TextField
            label={t('dashboard.deleteConfirmLabel', { nickname })}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            dir="ltr"
            className="font-latin"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            error={error}
          />
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={close}>
              {t('dashboard.cancel')}
            </Button>
            <Button type="submit" variant="danger" loading={deleting}>
              {t('dashboard.deleteConfirm')}
            </Button>
          </div>
        </form>
      </Dialog>
    </Card>
  );
}
