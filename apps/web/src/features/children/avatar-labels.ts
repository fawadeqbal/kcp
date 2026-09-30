'use client';

import { AVATAR_KEYS, type AvatarKey } from '@kcp/shared';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

/** Translated names of the preset avatars, for screen readers and the picker. */
export function useAvatarLabels(): Record<AvatarKey, string> {
  const t = useTranslations('avatars');
  return useMemo(
    () => Object.fromEntries(AVATAR_KEYS.map((key) => [key, t(key)])) as Record<AvatarKey, string>,
    [t],
  );
}
