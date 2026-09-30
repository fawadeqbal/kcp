'use client';

import type { components } from '@kcp/api-client-ts';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Avatar } from '@/components/ui';

type Child = components['schemas']['ChildDto'];

/**
 * What a child needs to log in, ready to print. The password isn't shown: the parent
 * chose it and writes it on the card by hand.
 */
export function LoginCard({ child }: { child: Child }) {
  const t = useTranslations('addChild');
  const locale = useLocale();
  const [loginUrl, setLoginUrl] = useState('');

  useEffect(() => {
    setLoginUrl(`${window.location.host}/${locale}/login/student`);
  }, [locale]);

  return (
    <section
      aria-label={t('cardTitle')}
      className="rounded-[var(--radius-card)] border-2 border-dashed border-brand-500 bg-surface p-6 sm:p-8"
    >
      <p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">
        {t('cardTitle')}
      </p>
      <div className="mt-4 flex items-center gap-4">
        <Avatar avatarKey={child.avatarKey} size="lg" />
        <p className="font-latin text-2xl font-bold">
          <bdi>{child.nickname}</bdi>
        </p>
      </div>
      <dl className="mt-6 grid gap-4 sm:grid-cols-[auto_1fr] sm:gap-x-6">
        <dt className="text-muted">{t('cardUsername')}</dt>
        <dd className="font-latin text-xl font-semibold" data-testid="child-username">
          <bdi>{child.username}</bdi>
        </dd>
        <dt className="text-muted">{t('cardPassword')}</dt>
        <dd>
          <span className="block min-h-8 border-b-2 border-line" aria-hidden />
          <span className="text-sm text-muted">{t('cardPasswordNote')}</span>
        </dd>
        <dt className="text-muted">{t('cardWhere')}</dt>
        <dd className="font-latin break-all">
          <bdi>{loginUrl}</bdi>
        </dd>
      </dl>
    </section>
  );
}
