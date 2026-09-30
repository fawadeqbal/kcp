'use client';

import { BADGES } from '@kcp/shared';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Button, Dialog } from '@/components/ui';
import { api } from '@/lib/api';

const ICONS = new Map(BADGES.map((badge) => [badge.key, badge.icon]));

/** A badge's emoji (a star for badges the app doesn't know yet). */
export function badgeIcon(key: string) {
  return ICONS.get(key) ?? '⭐';
}

/**
 * Celebrates newly earned badges, one at a time, then marks them seen so each is
 * celebrated once. The pop animation only plays for people who don't ask for reduced
 * motion.
 */
export function BadgeCelebration({ keys }: { keys: string[] }) {
  const t = useTranslations('badges');
  const [queue, setQueue] = useState<string[]>([]);

  useEffect(() => {
    if (keys.length === 0) return;
    setQueue((current) => [...current, ...keys.filter((key) => !current.includes(key))]);
  }, [keys]);

  const current = queue[0];

  function next() {
    if (!current) return;
    void api.POST('/v1/badges/seen', { body: { keys: [current] } }).catch(() => undefined);
    setQueue((rest) => rest.slice(1));
  }

  return (
    <Dialog open={Boolean(current)} onClose={next} title={t('celebrateTitle')}>
      {current ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <span
            aria-hidden="true"
            className="grid size-26 place-items-center rounded-full bg-brand-100 text-5xl ring-8 ring-brand-200/60 motion-safe:animate-[kcp-pop_400ms_ease-out]"
          >
            {badgeIcon(current)}
          </span>
          <p className="font-display text-3xl">{t(`${current}.name` as 'first-steps.name')}</p>
          <p className="text-muted">{t(`${current}.description` as 'first-steps.description')}</p>
          <Button onClick={next} size="lg" className="mt-2 self-stretch sm:self-center">
            {t('celebrateClose')}
          </Button>
        </div>
      ) : null}
    </Dialog>
  );
}

/** Celebrates badges earned earlier and not seen yet (e.g. given by the weekly results). */
export function UnseenBadges({ count }: { count: number }) {
  const [keys, setKeys] = useState<string[]>([]);
  useEffect(() => {
    if (count === 0) return;
    let cancelled = false;
    api
      .GET('/v1/badges')
      .then(({ data }) => {
        if (!cancelled && data) {
          setKeys(data.badges.filter((b) => b.earned && !b.seen).map((b) => b.key));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [count]);
  return <BadgeCelebration keys={keys} />;
}
