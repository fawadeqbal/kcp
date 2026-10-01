'use client';

import type { PictureKey } from '@kcp/shared';
import { clsx } from 'clsx';
import { useLocale, useTranslations } from 'next-intl';
import QRCode from 'qrcode';
import { type FormEvent, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AuthCard,
  Avatar,
  Button,
  Icon,
  IconBubble,
  PasswordField,
  Spinner,
  TextField,
} from '@/components/ui';
import { Link, useRouter } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { homePath, type LoginResult, useAuth } from '@/lib/auth-provider';
import { errorMessageKey } from '@/lib/errors';
import { forgetKid, type KidOnDevice, kidsOnDevice } from '@/lib/kids-on-device';
import { onTabKeyDown } from '../learn/tabs';
import { PickedPictures, PicturePad } from '../young/pictures';

type Tab = 'password' | 'pictures' | 'phone';
const TABS: Tab[] = ['password', 'pictures', 'phone'];

/**
 * Children sign in with the username their parent got and a password; younger ones
 * can tap a picture password instead, or be signed in from a parent's phone (the
 * device shows a code, the parent approves it).
 */
export function StudentLoginForm() {
  const t = useTranslations();
  const { state, logout } = useAuth();
  const [kids, setKids] = useState<KidOnDevice[]>([]);
  const [tab, setTab] = useState<Tab>('password');
  useEffect(() => {
    const known = kidsOnDevice();
    setKids(known);
    // The child who signed in here last used their pictures: start there.
    if (known[0]?.pictures) setTab('pictures');
  }, []);

  // On a shared family computer, a parent may still be signed in.
  if (state.status === 'authenticated' && state.user.kind === 'ADULT') {
    return (
      <AuthCard title={t('auth.student.title')}>
        <Alert>{t('auth.student.someoneSignedIn', { name: state.user.displayName ?? '' })}</Alert>
        <Button size="lg" onClick={() => void logout()}>
          {t('auth.student.logOutFirst')}
        </Button>
      </AuthCard>
    );
  }

  const labels: Record<Tab, string> = {
    password: t('studentLogin.tabPassword'),
    pictures: t('studentLogin.tabPictures'),
    phone: t('studentLogin.tabPhone'),
  };
  return (
    <AuthCard title={t('auth.student.title')} subtitle={t('auth.student.subtitle')}>
      <div
        role="tablist"
        aria-label={t('auth.student.title')}
        className="flex gap-1 rounded-full bg-raised p-1"
      >
        {TABS.map((key, index) => (
          <button
            key={key}
            id={`login-tab-${key}`}
            type="button"
            role="tab"
            aria-selected={tab === key}
            aria-controls="login-panel"
            tabIndex={tab === key ? 0 : -1}
            onClick={() => setTab(key)}
            onKeyDown={(event) => onTabKeyDown(event, TABS.length, index, (i) => setTab(TABS[i]!))}
            className={clsx(
              'min-h-10 flex-1 rounded-full px-3 text-sm transition-colors',
              tab === key
                ? 'elev-sm bg-canvas font-bold'
                : 'font-semibold text-muted hover:text-ink',
            )}
          >
            {labels[key]}
          </button>
        ))}
      </div>
      <div
        id="login-panel"
        role="tabpanel"
        aria-labelledby={`login-tab-${tab}`}
        className="flex flex-col gap-5"
      >
        {tab === 'password' ? <PasswordPanel /> : null}
        {tab === 'pictures' ? (
          <PicturesPanel
            kids={kids}
            onForget={(username) => {
              forgetKid(username);
              setKids(kidsOnDevice());
            }}
          />
        ) : null}
        {tab === 'phone' ? <PhonePanel /> : null}
      </div>
      <p className="flex gap-2.5 rounded-row bg-raised px-4 py-3 text-sm text-muted">
        <Icon name="key" className="mt-0.5 shrink-0 text-base" />
        {t('auth.student.forgot')}
      </p>
      <Link
        href="/login"
        className="flex items-center gap-3.5 rounded-row bg-sage-100 px-4.5 py-3.5 font-bold text-sage-900 transition-colors hover:bg-sage-200"
      >
        <IconBubble icon="users" tone="sageSolid" size="sm" />
        <span className="flex-1">{t('auth.student.parentLink')}</span>
        <Icon name="arrow" className="text-lg text-sage-text" />
      </Link>
    </AuthCard>
  );
}

/** Where a successful sign-in goes; a failed one gives the message to show. */
function useFinish() {
  const t = useTranslations();
  const router = useRouter();
  return useCallback(
    (result: LoginResult, invalidKey: 'auth.student.invalid' | 'studentLogin.pictureWrong') => {
      if (result.ok) {
        router.replace(homePath(result.user));
        return null;
      }
      return result.code === 'INVALID_CREDENTIALS'
        ? t(invalidKey)
        : t(`errors.${errorMessageKey(result.code, result.network)}`);
    },
    [router, t],
  );
}

function PasswordPanel() {
  const t = useTranslations();
  const { loginStudent } = useAuth();
  const finish = useFinish();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const found = {
      username: username.trim() ? undefined : t('validation.required'),
      password: password ? undefined : t('validation.required'),
    };
    setErrors(found);
    if (found.username || found.password) return;

    setSubmitting(true);
    const result = await loginStudent(username.trim().toLowerCase(), password);
    setSubmitting(false);
    setFormError(finish(result, 'auth.student.invalid'));
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
      <TextField
        label={t('auth.student.username')}
        hint={t('auth.student.usernameHint')}
        name="username"
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        dir="ltr"
        className="font-latin"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        error={errors.username}
      />
      <PasswordField
        label={t('auth.password')}
        name="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
      />
      {formError ? <Alert tone="error">{formError}</Alert> : null}
      <Button type="submit" size="lg" loading={submitting}>
        {t('auth.student.submit')}
        <Icon name="arrow" />
      </Button>
    </form>
  );
}

/** Pick who you are (children who signed in here before) or type a username, then tap four pictures. */
function PicturesPanel({
  kids,
  onForget,
}: {
  kids: KidOnDevice[];
  onForget: (username: string) => void;
}) {
  const t = useTranslations();
  const { loginWithPictures } = useAuth();
  const finish = useFinish();
  const [kid, setKid] = useState<KidOnDevice | null>(null);
  const [typing, setTyping] = useState(false);
  const [username, setUsername] = useState('');
  const [picked, setPicked] = useState<PictureKey[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const who = kid?.username ?? username.trim().toLowerCase();

  async function pick(picture: PictureKey) {
    if (busy || picked.length >= 4) return;
    const next = [...picked, picture];
    setPicked(next);
    setError(null);
    if (next.length < 4) return;
    if (!who) {
      setError(t('validation.required'));
      setPicked([]);
      return;
    }
    setBusy(true);
    const message = finish(await loginWithPictures(who, next), 'studentLogin.pictureWrong');
    setBusy(false);
    if (message) {
      setError(message);
      setPicked([]);
    }
  }

  if (!kid && !typing && kids.length) {
    return (
      <div className="flex flex-col gap-3">
        <p className="font-bold">{t('studentLogin.whoIsIt')}</p>
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {kids.map((k) => (
            <li key={k.username}>
              <button
                type="button"
                onClick={() => setKid(k)}
                className="flex w-full flex-col items-center gap-2 rounded-row bg-raised p-3 font-bold hover:bg-ink/7"
              >
                <Avatar avatarKey={k.avatarKey} size="lg" />
                <bdi>{k.nickname}</bdi>
              </button>
            </li>
          ))}
        </ul>
        <Button variant="secondary" onClick={() => setTyping(true)}>
          {t('studentLogin.someoneElse')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {kid ? (
        <div className="flex items-center gap-3">
          <Avatar avatarKey={kid.avatarKey} size="md" />
          <p className="flex-1 text-lg font-bold">
            <bdi>{kid.nickname}</bdi>
          </p>
          <button
            type="button"
            className="text-sm font-semibold text-muted underline-offset-4 hover:underline"
            onClick={() => {
              onForget(kid.username);
              setKid(null);
            }}
          >
            {t('studentLogin.forget', { nickname: kid.nickname })}
          </button>
        </div>
      ) : (
        <>
          <p className="text-muted">{t('studentLogin.picturesIntro')}</p>
          <TextField
            label={t('auth.student.username')}
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            dir="ltr"
            className="font-latin"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </>
      )}
      <p className="font-bold">{t('studentLogin.tapPictures')}</p>
      <PickedPictures picked={picked} onUndo={() => setPicked((p) => p.slice(0, -1))} />
      <PicturePad onPick={(picture) => void pick(picture)} disabled={busy} />
      {busy ? <Spinner /> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}

type Pairing = { pairingId: string; code: string; secret: string; qr: string };

/**
 * "Sign in with a parent's phone": this device shows a code and a QR code of the link
 * to approve it; it asks every few seconds whether a parent did, then signs in.
 */
function PhonePanel() {
  const t = useTranslations();
  const locale = useLocale();
  const { claimPairing } = useAuth();
  const finish = useFinish();
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [status, setStatus] = useState<'loading' | 'waiting' | 'approved' | 'expired' | 'failed'>(
    'loading',
  );
  const [error, setError] = useState<string | null>(null);
  const claimed = useRef(false);

  const start = useCallback(async () => {
    setStatus('loading');
    setError(null);
    claimed.current = false;
    try {
      const { data } = await api.POST('/v1/auth/pairing', { body: { app: 'web' } });
      if (!data) throw new Error('no pairing');
      const url = `${window.location.origin}/${locale}/pair?code=${encodeURIComponent(data.code)}`;
      const qr = await QRCode.toDataURL(url, { margin: 1, width: 240 });
      setPairing({ pairingId: data.pairingId, code: data.code, secret: data.secret, qr });
      setStatus('waiting');
    } catch {
      setStatus('failed');
    }
  }, [locale]);

  useEffect(() => {
    void start();
  }, [start]);

  useEffect(() => {
    if (!pairing || status !== 'waiting') return;
    const timer = setInterval(async () => {
      try {
        const { data } = await api.POST('/v1/auth/pairing/status', {
          body: { pairingId: pairing.pairingId, secret: pairing.secret },
        });
        if (data?.status === 'expired') setStatus('expired');
        if (data?.status === 'approved' && !claimed.current) {
          claimed.current = true;
          setStatus('approved');
          const message = finish(
            await claimPairing(pairing.pairingId, pairing.secret),
            'auth.student.invalid',
          );
          if (message) {
            setError(message);
            setStatus('expired');
          }
        }
      } catch {
        // Offline for a moment: try again next time.
      }
    }, 2500);
    return () => clearInterval(timer);
  }, [pairing, status, claimPairing, finish]);

  let content: ReactNode;
  if (status === 'loading') content = <Spinner />;
  else if (status === 'failed') content = <Alert tone="error">{t('errors.generic')}</Alert>;
  else if (status === 'expired' || !pairing) {
    content = (
      <>
        {error ? <Alert tone="error">{error}</Alert> : <p>{t('studentLogin.pairExpired')}</p>}
        <Button onClick={() => void start()}>{t('studentLogin.pairNew')}</Button>
      </>
    );
  } else {
    content = (
      <>
        <p className="text-muted">
          {t('studentLogin.pairBody', { url: `${window.location.host}/${locale}/pair` })}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-5">
          <img
            src={pairing.qr}
            alt={t('studentLogin.pairQr')}
            width={200}
            height={200}
            className="rounded-row bg-white p-2"
          />
          <div className="text-center">
            <p className="text-sm font-bold text-muted">{t('studentLogin.pairCode')}</p>
            <p className="font-latin text-4xl font-extrabold tracking-[0.15em]" dir="ltr">
              {pairing.code}
            </p>
          </div>
        </div>
        <p className="flex items-center justify-center gap-2 font-semibold" aria-live="polite">
          <Spinner className="size-4" />
          {status === 'approved' ? t('studentLogin.pairApproved') : t('studentLogin.pairWaiting')}
        </p>
      </>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="font-bold">{t('studentLogin.pairTitle')}</p>
      {content}
    </div>
  );
}
