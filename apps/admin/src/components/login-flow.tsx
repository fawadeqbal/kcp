'use client';

import { Alert, AuthCard, Button, PasswordField, TextField } from '@kcp/ui';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { type FormEvent, useEffect, useState } from 'react';
import { type StepResult, useAuth } from '@/lib/auth';
import { errorMessage, NETWORK_ERROR } from '@/lib/errors';

type Step = { name: 'credentials' } | { name: 'setup' | 'code'; mfaToken: string };

const SHOW_HIDE = { showLabel: 'Show password', hideLabel: 'Hide password' };

/** Staff login: email and password, then an authenticator code (set up on first login). */
export function LoginFlow() {
  const router = useRouter();
  const { state, login } = useAuth();
  const [step, setStep] = useState<Step>({ name: 'credentials' });

  useEffect(() => {
    if (state.status === 'authenticated') router.replace('/');
  }, [state.status, router]);

  const title =
    step.name === 'credentials'
      ? 'Admin panel'
      : step.name === 'setup'
        ? 'Set up two-factor authentication'
        : 'Enter your code';

  return (
    <AuthCard
      title={title}
      subtitle={step.name === 'credentials' ? 'Staff accounts only.' : undefined}
    >
      {step.name === 'credentials' ? (
        <Credentials
          onNext={(result) => {
            if (result.next === 'setup' || result.next === 'code') {
              setStep({ name: result.next, mfaToken: result.mfaToken });
            }
          }}
          login={login}
        />
      ) : (
        <SecondStep
          key={step.mfaToken}
          mfaToken={step.mfaToken}
          setup={step.name === 'setup'}
          onRestart={() => setStep({ name: 'credentials' })}
        />
      )}
    </AuthCard>
  );
}

function Credentials({
  login,
  onNext,
}: {
  login: (email: string, password: string) => Promise<StepResult>;
  onNext: (result: StepResult) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    const result = await login(email.trim(), password);
    setBusy(false);
    if (result.next === 'error') {
      setError(result.network ? NETWORK_ERROR : errorMessage(result.code));
      return;
    }
    onNext(result);
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
      <TextField
        label="Email address"
        type="email"
        name="email"
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <PasswordField
        label="Password"
        name="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        {...SHOW_HIDE}
      />
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Button type="submit" loading={busy}>
        Continue
      </Button>
    </form>
  );
}

function SecondStep({
  mfaToken,
  setup,
  onRestart,
}: {
  mfaToken: string;
  setup: boolean;
  onRestart: () => void;
}) {
  const router = useRouter();
  const { setupTwoFactor, verify } = useAuth();
  const [secret, setSecret] = useState<{ secret: string; qr: string } | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!setup) return;
    let current = true;
    void setupTwoFactor(mfaToken).then(async (result) => {
      if (!current) return;
      if (!result) {
        setError(errorMessage('INVALID_OR_EXPIRED_TOKEN'));
        return;
      }
      const qr = await QRCode.toDataURL(result.otpauthUrl, { margin: 1, width: 220 });
      if (current) setSecret({ secret: result.secret, qr });
    });
    return () => {
      current = false;
    };
  }, [setup, mfaToken, setupTwoFactor]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const digits = code.replaceAll(/\s/g, '');
    if (!/^\d{6}$/.test(digits)) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setBusy(true);
    const result = await verify(mfaToken, digits);
    setBusy(false);
    if (result.next === 'done') {
      router.replace('/');
      return;
    }
    if (result.next === 'error') {
      setError(result.network ? NETWORK_ERROR : errorMessage(result.code));
      setCode('');
    }
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
      {setup ? (
        <div className="flex flex-col gap-3">
          <p>
            Scan this code with an authenticator app (Google Authenticator, Microsoft Authenticator,
            1Password…). You’ll need a code from it every time you log in.
          </p>
          {secret ? (
            <>
              <img
                src={secret.qr}
                alt="QR code for your authenticator app"
                width={220}
                height={220}
                className="self-center rounded-lg border border-line"
              />
              <p className="text-sm text-muted">
                Can’t scan it? Type this key instead:{' '}
                <code
                  className="font-latin rounded bg-canvas px-1.5 py-0.5 font-semibold break-all text-ink"
                  data-testid="mfa-secret"
                >
                  {secret.secret.match(/.{1,4}/g)?.join(' ')}
                </code>
              </p>
            </>
          ) : error ? null : (
            <p className="text-muted">Preparing your code…</p>
          )}
        </div>
      ) : (
        <p>Open your authenticator app and enter the current code for the admin panel.</p>
      )}
      <TextField
        label="6-digit code"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={7}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        autoFocus
      />
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Button type="submit" loading={busy}>
        {setup ? 'Turn on and log in' : 'Log in'}
      </Button>
      <Button variant="ghost" onClick={onRestart}>
        Start again
      </Button>
    </form>
  );
}
