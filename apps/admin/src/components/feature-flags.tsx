'use client';

import type { components } from '@kcp/api-client-ts';
import { Alert, Badge, Button, Card, Checkbox, Dialog, PageSpinner, TextField } from '@kcp/ui';
import { type FormEvent, useState } from 'react';
import { useAction } from '@/lib/action';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDateTime, humanize } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { PageHeader } from './shell';

type Flag = components['schemas']['FeatureFlagDto'];

/**
 * Admin → Feature flags: switch a feature on or off, for every country or only some,
 * with a reason. Every API server sees the change within 30 seconds.
 */
export function FeatureFlags() {
  const { state } = useAuth();
  const canChange = state.status === 'authenticated' && state.ability.can('update', 'FeatureFlag');
  const flags = useLoad(() => api.GET('/v1/admin/feature-flags'), 'flags');
  const countries = useLoad(() => api.GET('/v1/admin/prices'), 'flag-countries');
  const [editing, setEditing] = useState<Flag | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (flags.error) return <Alert tone="error">{flags.error}</Alert>;
  if (!flags.data) return <PageSpinner label="Loading" />;
  const codes = countries.data?.countries.map((c) => c.code) ?? [];

  return (
    <>
      <PageHeader
        title="Feature flags"
        description="Switch features on or off without a deploy. Changes reach every server within 30 seconds and are kept in the audit log."
      />
      <div className="flex flex-col gap-4">
        {notice ? <Alert tone="success">{notice}</Alert> : null}
        {flags.data.flags.map((flag) => (
          <Card
            key={flag.key}
            title={humanize(flag.key)}
            actions={
              canChange ? (
                <Button size="sm" variant="secondary" onClick={() => setEditing(flag)}>
                  Change
                </Button>
              ) : null
            }
          >
            <div className="flex flex-col gap-2">
              <p>
                <Badge tone={flag.enabled ? 'success' : 'neutral'}>
                  {flag.enabled ? 'On' : 'Off'}
                </Badge>{' '}
                {flag.enabled
                  ? flag.countryCodes.length
                    ? `in ${flag.countryCodes.join(', ')} only`
                    : 'in every country'
                  : null}
              </p>
              {flag.description ? <p className="text-muted">{flag.description}</p> : null}
              <p className="text-sm text-muted">
                <code className="font-latin">{flag.key}</code> · changed{' '}
                {formatDateTime(flag.updatedAt)}
                {flag.updatedBy ? ` by ${flag.updatedBy}` : ''}
              </p>
            </div>
          </Card>
        ))}
      </div>
      {editing ? (
        <FlagDialog
          flag={editing}
          countries={codes}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setNotice(`“${humanize(editing.key)}” saved.`);
            setEditing(null);
            flags.reload();
          }}
        />
      ) : null}
    </>
  );
}

function FlagDialog({
  flag,
  countries,
  onClose,
  onSaved,
}: {
  flag: Flag;
  countries: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [enabled, setEnabled] = useState(flag.enabled);
  const [everywhere, setEverywhere] = useState(flag.countryCodes.length === 0);
  const [only, setOnly] = useState(new Set(flag.countryCodes));
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<{ reason?: string; countries?: string }>({});
  const action = useAction();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: typeof errors = {};
    if (reason.trim().length < 3) next.reason = 'Write a short reason (at least 3 characters).';
    if (enabled && !everywhere && only.size === 0) next.countries = 'Pick at least one country.';
    setErrors(next);
    if (next.reason || next.countries) return;
    const ok = await action.run(() =>
      api.PATCH('/v1/admin/feature-flags/{key}', {
        params: { path: { key: flag.key } },
        body: { enabled, countryCodes: everywhere ? [] : [...only], reason: reason.trim() },
      }),
    );
    if (ok) onSaved();
  }

  return (
    <Dialog open onClose={onClose} title={`Change “${humanize(flag.key)}”`}>
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        {flag.description ? <p className="text-muted">{flag.description}</p> : null}
        <Checkbox label="On" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        <Checkbox
          label="In every country"
          checked={everywhere}
          disabled={!enabled}
          onChange={(e) => setEverywhere(e.target.checked)}
        />
        {enabled && !everywhere ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="font-medium">Only in</legend>
            {countries.map((code) => (
              <Checkbox
                key={code}
                label={code}
                checked={only.has(code)}
                onChange={(e) => {
                  const next = new Set(only);
                  if (e.target.checked) next.add(code);
                  else next.delete(code);
                  setOnly(next);
                }}
              />
            ))}
            {errors.countries ? <p className="text-sm text-danger">{errors.countries}</p> : null}
          </fieldset>
        ) : null}
        <TextField
          label="Reason"
          hint="Kept in the audit log."
          value={reason}
          maxLength={300}
          onChange={(e) => setReason(e.target.value)}
          error={errors.reason}
        />
        {action.error ? <Alert tone="error">{action.error}</Alert> : null}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={action.busy}>
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
