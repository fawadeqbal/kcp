'use client';

import type { components } from '@kcp/api-client-ts';
import type { PictureKey } from '@kcp/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Alert, Button } from '@/components/ui';
import { api, errorCode } from '@/lib/api';
import { errorMessageKey } from '@/lib/errors';
import { isolate } from '../auth/validation';
import { PickedPictures, PicturePad } from '../young/pictures';

type Child = components['schemas']['ChildDto'];

/** A parent sets (or removes) a child's picture password: four pictures, in order. */
export function PicturePasswordSection({
  child,
  onChange,
}: {
  child: Child;
  onChange: (child: Child) => void;
}) {
  const t = useTranslations();
  const [picked, setPicked] = useState<PictureKey[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const nickname = isolate(child.nickname);

  async function save(pictures: PictureKey[] | null) {
    setBusy(true);
    setMessage(null);
    try {
      const { data, error } = await api.PUT('/v1/children/{id}/picture-password', {
        params: { path: { id: child.id } },
        body: { pictures },
      });
      if (data) {
        onChange(data);
        setPicked([]);
        setMessage({
          tone: 'success',
          text: pictures ? t('picture.saved', { nickname }) : t('picture.removed'),
        });
      } else {
        setMessage({ tone: 'error', text: t(`errors.${errorMessageKey(errorCode(error))}`) });
      }
    } catch {
      setMessage({ tone: 'error', text: t('errors.network') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted">{t('picture.body', { nickname })}</p>
      {child.hasPicturePassword ? (
        <p className="text-sm font-semibold">{t('picture.has', { nickname })}</p>
      ) : null}
      <PickedPictures picked={picked} onUndo={() => setPicked((p) => p.slice(0, -1))} />
      <PicturePad
        onPick={(picture) => setPicked((p) => (p.length < 4 ? [...p, picture] : p))}
        disabled={busy}
      />
      <div aria-live="polite">
        {message ? (
          <Alert tone={message.tone} live={false}>
            {message.text}
          </Alert>
        ) : null}
      </div>
      <div className="flex flex-wrap justify-end gap-3">
        {child.hasPicturePassword ? (
          <Button variant="ghost" onClick={() => void save(null)} disabled={busy}>
            {t('picture.remove')}
          </Button>
        ) : null}
        <Button
          onClick={() => void save(picked)}
          loading={busy}
          aria-disabled={picked.length !== 4 || undefined}
          disabled={picked.length !== 4}
        >
          {t('picture.save')}
        </Button>
      </div>
    </div>
  );
}
