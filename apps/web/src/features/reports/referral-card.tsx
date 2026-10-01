'use client';

import type { components } from '@kcp/api-client-ts';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Button, Icon, IconBubble } from '@/components/ui';
import { api } from '@/lib/api';

type Summary = components['schemas']['ReferralSummaryDto'];

/** The parent's invite link, and how their invitations went (no names). */
export function ReferralCard() {
  const t = useTranslations('referral');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api
      .GET('/v1/referrals')
      .then(({ data }) => setSummary(data ?? null))
      .catch(() => undefined);
  }, []);

  if (!summary) return null;
  return (
    <section className="flex flex-col gap-2.5 rounded-card bg-surface p-6.5">
      <IconBubble icon="send" tone="neutral" />
      <h2 className="mt-1 text-xl">{t('title')}</h2>
      <p className="text-sm text-muted">
        {t('body', { days: String(summary.rewardDays), max: String(summary.maxPerYear) })}
      </p>
      <label className="text-sm font-semibold" htmlFor="invite-link">
        {t('link')}
      </label>
      <input
        id="invite-link"
        readOnly
        dir="ltr"
        value={summary.link}
        onFocus={(event) => event.currentTarget.select()}
        className="w-full rounded-full border border-line bg-raised px-4 py-2 font-latin text-sm"
      />
      <Button
        variant="secondary"
        size="sm"
        className="self-start"
        onClick={() => {
          void navigator.clipboard
            ?.writeText(summary.link)
            .then(() => setCopied(true))
            .catch(() => undefined);
        }}
      >
        <Icon name={copied ? 'check' : 'copy'} />
        {copied ? t('copied') : t('copy')}
      </Button>
      <p className="text-sm text-muted">
        {t('stats', {
          invited: String(summary.invitations.length),
          rewarded: String(summary.rewardedThisYear),
          max: String(summary.maxPerYear),
        })}
      </p>
    </section>
  );
}
