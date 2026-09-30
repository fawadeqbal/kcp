'use client';

import { CHILD_CONSENTS, type ChildConsent } from '@kcp/shared';
import { useTranslations } from 'next-intl';
import { Switch } from '@/components/ui';

export type Consents = Record<ChildConsent, boolean>;

export const NO_CONSENTS: Consents = { publicLeaderboards: false, publicPortfolio: false };

/** The parent's on/off choices for one child. Both start off. */
export function ConsentSwitches({
  value,
  onChange,
  busy,
}: {
  value: Consents;
  onChange: (consent: ChildConsent, on: boolean) => void;
  busy?: ChildConsent | null;
}) {
  const t = useTranslations('consents');
  return (
    <div className="flex flex-col gap-4">
      {CHILD_CONSENTS.map((consent) => (
        <Switch
          key={consent}
          label={t(consent)}
          description={t(`${consent}Body`)}
          checked={value[consent]}
          busy={busy === consent}
          // One change at a time: each request sends both switches.
          disabled={Boolean(busy)}
          onChange={(on) => onChange(consent, on)}
        />
      ))}
    </div>
  );
}
