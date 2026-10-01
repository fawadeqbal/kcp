'use client';

import type { components } from '@kcp/api-client-ts';
import { type AvatarKey, type ChildConsent, isAvatarKey } from '@kcp/shared';
import { useFormatter, useTranslations } from 'next-intl';
import { clsx } from 'clsx';
import { type FormEvent, type ReactNode, useId, useState } from 'react';
import {
  Alert,
  Avatar,
  AvatarPicker,
  Button,
  buttonClass,
  Dialog,
  Icon,
  type IconName,
  PasswordField,
  SelectField,
  Switch,
  TextField,
} from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { api, errorCode } from '@/lib/api';
import { errorMessageKey, isNicknameError } from '@/lib/errors';
import { CHILD_PASSWORD_MIN_LENGTH, isNickname, isolate } from '../auth/validation';
import { useAvatarLabels } from './avatar-labels';
import { ChildCertificates } from '../certificates/child-certificates';
import { ConsentSwitches } from './consent-switches';
import { ChildFriendsSection } from '../friends/parent-friends';
import { ChildRoomsLink } from '../rooms/social-tabs';
import { ChildSkillsSection } from '../reports/skills-page';
import { PicturePasswordSection } from './picture-password';
import { ProjectsSection } from './projects-section';
import { useLanguages } from './reference-data';

export type Child = components['schemas']['ChildDto'];

type Message = { tone: 'success' | 'error'; text: string } | null;

/** A round pill with a figure about the child ("Level 3", "5 days in a row"). */
function Stat({
  icon,
  tone = 'plain',
  children,
}: {
  icon?: IconName;
  tone?: 'plain' | 'brand' | 'sage';
  children: ReactNode;
}) {
  return (
    <li
      className={clsx(
        'flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.8rem] font-semibold',
        tone === 'plain' && 'bg-raised',
        tone === 'brand' && 'bg-brand-100 font-bold text-brand-800',
        tone === 'sage' && 'bg-sage-100 font-bold text-sage-800',
      )}
    >
      {icon ? <Icon name={icon} className="text-[0.85rem] text-brand" /> : null}
      {children}
    </li>
  );
}

/** One of the three panels under "Manage": sharing, projects, account. */
function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-inner bg-raised p-5.5">
      <h4 className="text-lg">{title}</h4>
      {children}
    </section>
  );
}

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
  const nickname = isolate(child.nickname);

  return (
    <article aria-labelledby={headingId} className="overflow-hidden rounded-hero bg-surface">
      <div className="flex flex-wrap items-center gap-5 p-5 sm:px-7 sm:py-6.5">
        <Avatar avatarKey={child.avatarKey} size="xl" />
        <div className="flex min-w-0 flex-1 basis-72 flex-col gap-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <h3 id={headingId} className="text-[1.65rem]">
              <bdi>{child.nickname}</bdi>
            </h3>
            <p className="font-mono text-sm text-muted">
              <bdi>{child.username}</bdi>
            </p>
          </div>
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
          <ul className="mt-1.5 flex flex-wrap gap-2">
            <Stat tone="brand">{t('level', { level: String(child.level) })}</Stat>
            <Stat>{t('xp', { xp: String(child.xpTotal) })}</Stat>
            <Stat icon="flame">{t('streak', { count: String(child.streak) })}</Stat>
            <Stat icon="award">{t('badges', { count: String(child.badges) })}</Stat>
            <Stat tone={child.premiumSource ? 'sage' : 'plain'}>
              {child.premiumSource === 'subscription'
                ? t('premiumPlan')
                : child.premiumSource && child.premiumUntil
                  ? t(child.premiumSource === 'trial' ? 'premiumTrial' : 'premium', {
                      date: format.dateTime(new Date(child.premiumUntil), { dateStyle: 'medium' }),
                    })
                  : t('premiumNone')}
            </Stat>
          </ul>
        </div>
        <Button
          variant="secondary"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? t('close') : t('manage')}
          <Icon name={open ? 'chevU' : 'chevD'} />
        </Button>
      </div>
      {child.status === 'PENDING_CONSENT' ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-4 sm:px-7">
          <Icon name="clock" className="text-lg text-warn-text" />
          <p className="flex-1 font-bold">{t('consentPending')}</p>
          <Link href={`/children/${child.id}/consent`} className={buttonClass('primary', 'md')}>
            {t('consentFinish')}
          </Link>
        </div>
      ) : null}
      {open ? (
        <div id={panelId} className="grid gap-3.5 px-5 pb-6 sm:px-7 sm:pb-7 lg:grid-cols-3">
          <Panel title={t('sharingTitle', { nickname })}>
            <SharingSection child={child} onChange={onChange} />
          </Panel>
          <Panel title={t('projectsTitle')}>
            <ProjectsSection child={child} />
            <ChildCertificates childId={child.id} />
          </Panel>
          <Panel title={t('accountPanel')}>
            <AccountActions child={child} onChange={onChange} onDeleted={onDeleted} />
          </Panel>
        </div>
      ) : null}
    </article>
  );
}

/** The account panel: profile, password, phone reminders and delete. */
function AccountActions({
  child,
  onChange,
  onDeleted,
}: {
  child: Child;
  onChange: (child: Child) => void;
  onDeleted: (child: Child) => void;
}) {
  const t = useTranslations('dashboard');
  const [dialog, setDialog] = useState<
    'profile' | 'password' | 'pictures' | 'friends' | 'skills' | null
  >(null);
  const row =
    'flex min-h-12 w-full items-center gap-3 rounded-full px-3 text-start text-sm font-semibold hover:bg-ink/7';
  return (
    <div className="-mt-1 flex flex-col">
      <button type="button" className={row} onClick={() => setDialog('profile')}>
        <Icon name="user" className="text-base text-muted" />
        <span className="flex-1">{t('profileTitle')}</span>
        <Icon name="chevR" className="text-sm text-muted" />
      </button>
      <button type="button" className={row} onClick={() => setDialog('password')}>
        <Icon name="key" className="text-base text-muted" />
        <span className="flex-1">{t('passwordTitle')}</span>
        <Icon name="chevR" className="text-sm text-muted" />
      </button>
      <button type="button" className={row} onClick={() => setDialog('pictures')}>
        <Icon name="star" className="text-base text-muted" />
        <span className="flex-1">{t('picturePassword')}</span>
        <Icon name="chevR" className="text-sm text-muted" />
      </button>
      <button type="button" className={row} onClick={() => setDialog('skills')}>
        <Icon name="target" className="text-base text-muted" />
        <span className="flex-1">{t('skillsTitle')}</span>
        <Icon name="chevR" className="text-sm text-muted" />
      </button>
      <button type="button" className={row} onClick={() => setDialog('friends')}>
        <Icon name="users" className="text-base text-muted" />
        <span className="flex-1">{t('friendsTitle')}</span>
        <Icon name="chevR" className="text-sm text-muted" />
      </button>
      <ChildRoomsLink childId={child.id} className={row} />
      <RemindersSection child={child} onChange={onChange} />
      <DeleteSection child={child} onDeleted={onDeleted} rowClassName={row} />
      <Dialog open={dialog === 'profile'} onClose={() => setDialog(null)} title={t('profileTitle')}>
        <ProfileSection child={child} onChange={onChange} onDone={() => setDialog(null)} />
      </Dialog>
      <Dialog
        open={dialog === 'password'}
        onClose={() => setDialog(null)}
        title={t('passwordTitle')}
      >
        <PasswordSection child={child} onDone={() => setDialog(null)} />
      </Dialog>
      <Dialog
        open={dialog === 'pictures'}
        onClose={() => setDialog(null)}
        title={t('picturePassword')}
      >
        <PicturePasswordSection child={child} onChange={onChange} />
      </Dialog>
      <Dialog open={dialog === 'skills'} onClose={() => setDialog(null)} title={t('skillsTitle')}>
        {dialog === 'skills' ? (
          <ChildSkillsSection childId={child.id} nickname={child.nickname} />
        ) : null}
      </Dialog>
      <Dialog open={dialog === 'friends'} onClose={() => setDialog(null)} title={t('friendsTitle')}>
        {dialog === 'friends' ? (
          <ChildFriendsSection childId={child.id} nickname={child.nickname} />
        ) : null}
      </Dialog>
    </div>
  );
}

function StatusLine({ message }: { message: Message }) {
  // Always rendered, so screen readers announce changes to it.
  return (
    <p
      aria-live="polite"
      className={
        message?.tone === 'error'
          ? 'text-sm font-semibold text-danger'
          : 'text-sm font-semibold text-sage-text'
      }
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
    <>
      <ConsentSwitches value={child.consents} onChange={toggle} busy={busy} />
      <StatusLine message={message} />
    </>
  );
}

/** Notifications on the child's phone (the mobile app): only the streak reminder. */
function RemindersSection({ child, onChange }: { child: Child; onChange: (child: Child) => void }) {
  const t = useTranslations();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  async function toggle(on: boolean) {
    const previous = child;
    onChange({ ...child, streakReminders: on });
    setBusy(true);
    setMessage(null);
    try {
      const { data, error } = await api.PATCH('/v1/children/{id}', {
        params: { path: { id: child.id } },
        body: { streakReminders: on },
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
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1 px-3 py-2.5">
      <Switch
        label={t('dashboard.streakReminders')}
        description={t('dashboard.streakRemindersBody', { nickname: isolate(child.nickname) })}
        checked={child.streakReminders}
        busy={busy}
        disabled={busy}
        onChange={(on) => void toggle(on)}
      />
      <StatusLine message={message} />
    </div>
  );
}

function ProfileSection({
  child,
  onChange,
  onDone,
}: {
  child: Child;
  onChange: (child: Child) => void;
  onDone: () => void;
}) {
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
      <StatusLine message={message} />
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={onDone}>
          {t('dashboard.close')}
        </Button>
        <Button type="submit" loading={saving}>
          {t('dashboard.profileSave')}
        </Button>
      </div>
    </form>
  );
}

function PasswordSection({ child, onDone }: { child: Child; onDone: () => void }) {
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
      <StatusLine message={message} />
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={onDone}>
          {t('dashboard.close')}
        </Button>
        <Button type="submit" loading={saving}>
          {t('dashboard.passwordSubmit')}
        </Button>
      </div>
    </form>
  );
}

function DeleteSection({
  child,
  onDeleted,
  rowClassName,
}: {
  child: Child;
  onDeleted: (child: Child) => void;
  rowClassName: string;
}) {
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
    <>
      <button
        type="button"
        className={clsx(rowClassName, 'text-danger hover:bg-danger-soft')}
        onClick={() => setOpen(true)}
      >
        <Icon name="trash" className="text-base" />
        {t('dashboard.deleteButton')}
      </button>
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
    </>
  );
}
