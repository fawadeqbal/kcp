'use client';

import type { components } from '@kcp/api-client-ts';
import { useFormatter, useTranslations } from 'next-intl';
import { type FormEvent, useState } from 'react';
import { BackLink } from '@/components/back-link';
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  Icon,
  PageSpinner,
  PasswordField,
  SectionHeading,
  SelectField,
  TextField,
} from '@/components/ui';
import { api } from '@/lib/api';
import { useAccount } from '@/lib/use-account';
import { isolate } from '../auth/validation';
import { Money, NoticeArea, PayoutStatusBadge, useAction, useLoad } from './hub-common';

type Account = components['schemas']['PayoutAccountDto'];

const CURRENCIES = ['PKR', 'EGP', 'AED', 'SAR', 'USD'] as const;
const COUNTRIES = ['PK', 'EG', 'AE', 'SA'] as const;

function AccountForm({
  onSaved,
  onCancel,
}: {
  onSaved: (account: Account) => void;
  onCancel?: () => void;
}) {
  const t = useTranslations('hub.payouts');
  const { busy, notice, run } = useAction();
  const [kind, setKind] = useState<'IBAN' | 'OTHER'>('IBAN');
  const [holderName, setHolderName] = useState('');
  const [iban, setIban] = useState('');
  const [details, setDetails] = useState('');
  const [currency, setCurrency] = useState<string>('PKR');
  const [countryCode, setCountryCode] = useState<string>('PK');
  const [password, setPassword] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    await run(
      'save',
      async () => {
        const result = await api.PUT('/v1/payout-account', {
          body: {
            password,
            kind,
            holderName,
            currency,
            ...(kind === 'IBAN' ? { iban } : { details, countryCode }),
          },
        });
        if (result.data) onSaved(result.data);
        return result;
      },
      t('saved'),
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <fieldset className="flex flex-wrap gap-3">
        <legend className="mb-2 font-semibold">{t('kind')}</legend>
        {(['IBAN', 'OTHER'] as const).map((value) => (
          <label
            key={value}
            className="flex items-center gap-2 rounded-full border-2 border-line px-4 py-2"
          >
            <input
              type="radio"
              name="kind"
              value={value}
              checked={kind === value}
              onChange={() => setKind(value)}
              className="accent-primary"
            />
            {t(`kinds.${value}`)}
          </label>
        ))}
      </fieldset>
      <TextField
        label={t('holderName')}
        hint={t('holderHint')}
        value={holderName}
        maxLength={120}
        required
        onChange={(e) => setHolderName(e.target.value)}
        autoComplete="name"
      />
      {kind === 'IBAN' ? (
        <TextField
          label={t('iban')}
          hint={t('ibanHint')}
          value={iban}
          maxLength={42}
          required
          dir="ltr"
          onChange={(e) => setIban(e.target.value)}
        />
      ) : (
        <>
          <TextField
            label={t('details')}
            hint={t('detailsHint')}
            value={details}
            maxLength={300}
            required
            onChange={(e) => setDetails(e.target.value)}
          />
          <SelectField
            label={t('country')}
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
          >
            {COUNTRIES.map((code) => (
              <option key={code} value={code}>
                {t(`countries.${code}`)}
              </option>
            ))}
          </SelectField>
        </>
      )}
      <SelectField
        label={t('currency')}
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
      >
        {CURRENCIES.map((code) => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </SelectField>
      <PasswordField
        label={t('password')}
        hint={t('passwordHint')}
        value={password}
        required
        autoComplete="current-password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <NoticeArea notice={notice} />
      <div className="flex flex-wrap gap-2.5">
        <Button type="submit" loading={busy === 'save'} disabled={!password || !holderName}>
          {t('save')}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t('cancel')}
          </Button>
        ) : null}
      </div>
      <p className="text-sm text-muted">{t('safety')}</p>
    </form>
  );
}

/**
 * Where a parent receives their children's hub earnings, and the payouts: each one is
 * confirmed by the parent before it's sent.
 */
export function PayoutsPage() {
  const t = useTranslations('hub.payouts');
  const format = useFormatter();
  const user = useAccount('PARENT');
  const account = useLoad(async () => {
    const { data, response } = await api.GET('/v1/payout-account');
    return response.ok ? { account: (data ?? null) as Account | null } : undefined;
  }, [user?.id]);
  const payouts = useLoad(async () => (await api.GET('/v1/payouts')).data, [user?.id]);
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [password, setPassword] = useState('');
  const { busy, notice, run } = useAction();
  if (!user || (!account.data && !account.failed)) return <PageSpinner />;
  const current = account.data?.account ?? null;
  const date = (value: string) =>
    format.dateTime(new Date(value), { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <BackLink href="/hub">{t('back')}</BackLink>
      <header className="flex flex-col gap-2">
        <SectionHeading level={1}>{t('title')}</SectionHeading>
        <p className="text-lg text-muted">{t('intro')}</p>
      </header>
      <NoticeArea notice={notice} />

      <Card title={t('accountTitle')}>
        {current && !editing ? (
          <div className="flex flex-col gap-3">
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-bold">{isolate(current.holderName)}</span>
              <span dir="ltr" className="font-latin">
                {current.kind === 'IBAN' ? `IBAN •••• ${current.last4}` : `•••• ${current.last4}`}
              </span>
              <Badge>{current.currency}</Badge>
              <Badge tone={current.state === 'READY' ? 'success' : 'warning'}>
                {t(`states.${current.state}`)}
              </Badge>
            </p>
            {current.state === 'COOLING' ? (
              <p className="text-sm text-muted">
                {t('coolingUntil', { date: date(current.usableFrom) })}
              </p>
            ) : current.state === 'CHECKING' ? (
              <p className="text-sm text-muted">{t('checking')}</p>
            ) : null}
            <div className="flex flex-wrap gap-2.5">
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                <Icon name="pencil" />
                {t('change')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setRemoving(true)}>
                <Icon name="trash" />
                {t('remove')}
              </Button>
            </div>
          </div>
        ) : (
          <AccountForm
            onSaved={(saved) => {
              account.setData({ account: saved });
              setEditing(false);
              void payouts.reload();
            }}
            onCancel={current ? () => setEditing(false) : undefined}
          />
        )}
      </Card>

      <Card title={t('listTitle')}>
        {(payouts.data ?? []).length === 0 ? (
          <EmptyState icon="wallet" title={t('none')} body={t('noneHint')} />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {(payouts.data ?? []).map((payout) => (
              <li key={payout.id} className="flex flex-col gap-2 rounded-inner bg-raised p-4">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="flex-1 font-bold">
                    {t('payoutFor', { nickname: isolate(payout.childNickname) })}{' '}
                    <span className="text-sm font-normal text-muted">{payout.reference}</span>
                  </span>
                  <span className="text-lg font-bold">
                    <Money minor={payout.netMinor} currency={payout.currency} />
                  </span>
                  <PayoutStatusBadge status={payout.status} />
                </p>
                <p className="text-sm text-muted">
                  {payout.accountLast4 ? t('toAccount', { last4: payout.accountLast4 }) : null}
                  {payout.withheldMinor ? (
                    <>
                      {' · '}
                      {t('withheld')}{' '}
                      <Money minor={payout.withheldMinor} currency={payout.currency} />
                    </>
                  ) : null}
                  {payout.paidAt ? ` · ${t('paidOn', { date: date(payout.paidAt) })}` : null}
                </p>
                {payout.canConfirm ? (
                  <div className="flex flex-wrap gap-2.5">
                    <Button
                      size="sm"
                      loading={busy === `yes:${payout.id}`}
                      disabled={busy !== null}
                      onClick={() =>
                        void run(
                          `yes:${payout.id}`,
                          async () => {
                            const result = await api.POST('/v1/payouts/{id}/confirm', {
                              params: { path: { id: payout.id } },
                            });
                            if (result.data) payouts.setData(result.data);
                            return result;
                          },
                          t('confirmed'),
                        )
                      }
                    >
                      <Icon name="check" />
                      {t('confirm')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={busy === `no:${payout.id}`}
                      disabled={busy !== null}
                      onClick={() =>
                        void run(
                          `no:${payout.id}`,
                          async () => {
                            const result = await api.POST('/v1/payouts/{id}/decline', {
                              params: { path: { id: payout.id } },
                            });
                            if (result.data) payouts.setData(result.data);
                            return result;
                          },
                          t('declined'),
                        )
                      }
                    >
                      {t('decline')}
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Dialog open={removing} onClose={() => setRemoving(false)} title={t('removeTitle')}>
        <p>{t('removeBody')}</p>
        <PasswordField
          label={t('password')}
          value={password}
          autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="flex flex-wrap gap-2.5">
          <Button
            variant="danger"
            disabled={!password}
            loading={busy === 'remove'}
            onClick={() =>
              void run(
                'remove',
                () => api.POST('/v1/payout-account/remove', { body: { password } }),
                t('removed'),
              ).then((ok) => {
                if (ok) {
                  account.setData({ account: null });
                  setRemoving(false);
                  setPassword('');
                  void payouts.reload();
                }
              })
            }
          >
            {t('removeConfirm')}
          </Button>
          <Button variant="ghost" onClick={() => setRemoving(false)}>
            {t('cancel')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
