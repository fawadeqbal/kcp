'use client';

import type { components } from '@kcp/api-client-ts';
import { Alert, Badge, Button, Card, Dialog, PageSpinner, Switch, TextField } from '@kcp/ui';
import { type FormEvent, useState } from 'react';
import { useAction } from '@/lib/action';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatMoney, parseMoney } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { Cell, Table } from './data';
import { PageHeader } from './shell';

type Country = components['schemas']['CountryPricesDto'];
type Language = components['schemas']['LanguageAdminDto'];

const nameOf = (country: Country) => country.names['en'] ?? country.code;

/**
 * Admin → Countries and languages: switch a country on once its prices are set,
 * change prices (and the family discount), change a currency while a country is
 * off, and switch languages on or off.
 */
export function Countries() {
  const { state } = useAuth();
  const ability = state.status === 'authenticated' ? state.ability : null;
  const prices = useLoad(() => api.GET('/v1/admin/prices'), 'prices');
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<Country | null>(null);
  const canPrice = ability?.can('update', 'PlanPrice') ?? false;
  const canSwitch = ability?.can('update', 'Country') ?? false;

  if (prices.error) return <Alert tone="error">{prices.error}</Alert>;
  if (!prices.data) return <PageSpinner label="Loading" />;
  const done = (message: string) => {
    setNotice(message);
    prices.reload();
  };

  return (
    <>
      <PageHeader
        title="Countries and languages"
        description="Families can sign up in countries that are on. A country needs its monthly and yearly prices before it can be switched on."
      />
      <div className="flex flex-col gap-6">
        {notice ? <Alert tone="success">{notice}</Alert> : null}
        <Card title="Countries and prices">
          <Table
            caption="Countries and prices"
            columns={[
              'Country',
              'Open',
              'Monthly (per child)',
              'Yearly (per child)',
              'Family discount',
              '',
            ]}
          >
            {prices.data.countries.map((country) => (
              <CountryRow
                key={country.code}
                country={country}
                canSwitch={canSwitch}
                canPrice={canPrice}
                onEdit={() => setEditing(country)}
                onDone={done}
              />
            ))}
          </Table>
        </Card>
        <Languages onDone={done} />
      </div>
      {editing ? (
        <PricesDialog
          country={editing}
          canChangeCurrency={canSwitch && !editing.isActive}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            done(message);
          }}
        />
      ) : null}
    </>
  );
}

function CountryRow({
  country,
  canSwitch,
  canPrice,
  onEdit,
  onDone,
}: {
  country: Country;
  canSwitch: boolean;
  canPrice: boolean;
  onEdit: () => void;
  onDone: (message: string) => void;
}) {
  const action = useAction();
  const price = (key: string) => {
    const amount = country.prices[key] as number | null | undefined;
    return amount == null ? (
      <Badge tone="warning">Not set</Badge>
    ) : (
      formatMoney(amount, country.currency)
    );
  };
  return (
    <tr>
      <Cell>
        <span className="font-semibold">{nameOf(country)}</span>{' '}
        <span className="text-muted">
          ({country.code} · {country.currency})
        </span>
      </Cell>
      <Cell>
        <Switch
          label={`Open in ${nameOf(country)}`}
          checked={country.isActive}
          disabled={!canSwitch || action.busy}
          onChange={async (checked: boolean) => {
            const ok = await action.run(() =>
              api.PATCH('/v1/admin/countries/{code}', {
                params: { path: { code: country.code } },
                body: { isActive: checked },
              }),
            );
            if (ok)
              onDone(`${nameOf(country)} is ${checked ? 'open' : 'closed'} for new families.`);
          }}
        />
        {action.error ? <p className="mt-1 text-sm text-danger">{action.error}</p> : null}
      </Cell>
      <Cell>{price('monthly')}</Cell>
      <Cell>{price('yearly')}</Cell>
      <Cell>{country.familyDiscountPercent}% from the second child</Cell>
      <Cell>
        {canPrice ? (
          <Button size="sm" variant="secondary" onClick={onEdit}>
            Edit prices
          </Button>
        ) : null}
      </Cell>
    </tr>
  );
}

function PricesDialog({
  country,
  canChangeCurrency,
  onClose,
  onSaved,
}: {
  country: Country;
  canChangeCurrency: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [currency, setCurrency] = useState(country.currency);
  const toText = (key: string) => {
    const amount = country.prices[key] as number | null | undefined;
    return amount == null ? '' : formatMoney(amount, country.currency).replace(/^[A-Z]{3}\s*/, '');
  };
  const [monthly, setMonthly] = useState(toText('monthly'));
  const [yearly, setYearly] = useState(toText('yearly'));
  const [discount, setDiscount] = useState(String(country.familyDiscountPercent));
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const action = useAction();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const code = currency.trim().toUpperCase();
    const monthlyMinor = parseMoney(monthly, code);
    const yearlyMinor = parseMoney(yearly, code);
    const percent = Number(discount);
    const next: Record<string, string> = {};
    if (!/^[A-Z]{3}$/.test(code)) next['currency'] = 'Three letters, e.g. PKR.';
    if (!monthlyMinor) next['monthly'] = `An amount in ${code}, e.g. 1500.`;
    if (!yearlyMinor) next['yearly'] = `An amount in ${code}, e.g. 15000.`;
    if (!Number.isInteger(percent) || percent < 0 || percent > 90) {
      next['discount'] = 'A whole number from 0 to 90.';
    }
    if (reason.trim().length < 3) next['reason'] = 'Write a short reason (at least 3 characters).';
    setErrors(next);
    if (Object.keys(next).length) return;
    if (code !== country.currency) {
      const changed = await action.run(() =>
        api.PATCH('/v1/admin/countries/{code}', {
          params: { path: { code: country.code } },
          body: { currency: code },
        }),
      );
      if (!changed) return;
    }
    const ok = await action.run(() =>
      api.PUT('/v1/admin/prices/{code}', {
        params: { path: { code: country.code } },
        body: {
          monthlyMinor: monthlyMinor!,
          yearlyMinor: yearlyMinor!,
          familyDiscountPercent: percent,
          reason: reason.trim(),
        },
      }),
    );
    if (ok) onSaved(`Prices for ${nameOf(country)} saved.`);
  }

  return (
    <Dialog open onClose={onClose} title={`Prices in ${nameOf(country)}`}>
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <p className="text-muted">
          Per child. New prices apply to new plans and to renewals of manual plans; card plans keep
          their price until the family changes plan.
        </p>
        <TextField
          label="Currency"
          hint={
            canChangeCurrency
              ? 'Changing it removes the old prices: set both again.'
              : 'Switch the country off to change its currency.'
          }
          value={currency}
          maxLength={3}
          disabled={!canChangeCurrency}
          onChange={(e) => setCurrency(e.target.value)}
          error={errors['currency']}
        />
        <TextField
          label={`Monthly, per child (${currency.toUpperCase()})`}
          inputMode="decimal"
          value={monthly}
          onChange={(e) => setMonthly(e.target.value)}
          error={errors['monthly']}
        />
        <TextField
          label={`Yearly, per child (${currency.toUpperCase()})`}
          inputMode="decimal"
          value={yearly}
          onChange={(e) => setYearly(e.target.value)}
          error={errors['yearly']}
        />
        <TextField
          label="Family discount from the second child (%)"
          inputMode="numeric"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          error={errors['discount']}
        />
        <TextField
          label="Reason"
          hint="Kept in the audit log, e.g. “Launch prices for Egypt”."
          value={reason}
          maxLength={300}
          onChange={(e) => setReason(e.target.value)}
          error={errors['reason']}
        />
        {action.error ? <Alert tone="error">{action.error}</Alert> : null}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={action.busy}>
            Save prices
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function Languages({ onDone }: { onDone: (message: string) => void }) {
  const list = useLoad(() => api.GET('/v1/admin/languages'), 'languages');
  if (list.error) {
    return (
      <Card title="Languages">
        <p className="text-muted">{list.error}</p>
      </Card>
    );
  }
  if (!list.data) return null;
  return (
    <Card title="Languages">
      <p className="mb-3 text-muted">
        Only languages the apps are translated into can be switched on. English always stays on:
        every text falls back to it.
      </p>
      <Table caption="Languages" columns={['Language', 'On', 'Accounts', 'Lessons written in it']}>
        {list.data.languages.map((language) => (
          <LanguageRow
            key={language.code}
            language={language}
            onDone={(message) => {
              list.reload();
              onDone(message);
            }}
          />
        ))}
      </Table>
    </Card>
  );
}

function LanguageRow({
  language,
  onDone,
}: {
  language: Language;
  onDone: (message: string) => void;
}) {
  const action = useAction();
  return (
    <tr>
      <Cell>
        <span className="font-semibold">{language.name}</span>{' '}
        <span className="text-muted" dir="auto">
          {language.nativeName} ({language.code}
          {language.direction === 'RTL' ? ', right to left' : ''})
        </span>
      </Cell>
      <Cell>
        <Switch
          label={`${language.name} on`}
          checked={language.isActive}
          disabled={action.busy}
          onChange={async (checked: boolean) => {
            const ok = await action.run(() =>
              api.PATCH('/v1/admin/languages/{code}', {
                params: { path: { code: language.code } },
                body: { isActive: checked },
              }),
            );
            if (ok) onDone(`${language.name} is ${checked ? 'on' : 'off'}.`);
          }}
        />
        {action.error ? <p className="mt-1 text-sm text-danger">{action.error}</p> : null}
      </Cell>
      <Cell>{language.accounts.toLocaleString('en')}</Cell>
      <Cell>{language.lessons.toLocaleString('en')}</Cell>
    </tr>
  );
}
