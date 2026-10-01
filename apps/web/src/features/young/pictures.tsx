'use client';

import { PICTURE_KEYS, PICTURE_PASSWORD_LENGTH, type PictureKey } from '@kcp/shared';
import { clsx } from 'clsx';
import { useTranslations } from 'next-intl';
import { Icon } from '@/components/ui';

/**
 * The twelve pictures of picture passwords: each on its own colour, so children can
 * find them by colour as well as shape. The tiles keep dark ink in dark mode too (they
 * are pictures), which keeps them readable on their light backgrounds.
 */
export const PICTURE_COLOURS: Record<PictureKey, string> = {
  cat: '#fcd9b6',
  dog: '#e8d8c3',
  fish: '#c7e5f7',
  bird: '#d3eec6',
  rabbit: '#f1d4ea',
  sun: '#fdeb96',
  moon: '#d9d9f6',
  star: '#ffe39a',
  tree: '#c8e6d0',
  flower: '#f8d0da',
  apple: '#f9cdc4',
  car: '#d0e1f6',
};

export function PictureTile({
  picture,
  size = 'md',
  className,
}: {
  picture: PictureKey;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: PICTURE_COLOURS[picture], color: '#201e1d' }}
      className={clsx(
        'grid shrink-0 place-items-center rounded-row',
        size === 'sm' && 'size-10 text-xl',
        size === 'md' && 'size-16 text-3xl',
        size === 'lg' && 'size-20 text-4xl',
        className,
      )}
    >
      <Icon name={picture} />
    </span>
  );
}

/** The twelve pictures to tap, as buttons with their names for screen readers. */
export function PicturePad({
  onPick,
  disabled = false,
}: {
  onPick: (picture: PictureKey) => void;
  disabled?: boolean;
}) {
  const t = useTranslations('pictures');
  return (
    <div className="grid grid-cols-4 gap-2.5" dir="ltr">
      {PICTURE_KEYS.map((picture) => (
        <button
          key={picture}
          type="button"
          disabled={disabled}
          onClick={() => onPick(picture)}
          aria-label={t(picture)}
          className="grid place-items-center rounded-row p-1 transition-transform hover:scale-105 focus-visible:scale-105 disabled:opacity-50 motion-reduce:transition-none"
        >
          <PictureTile picture={picture} className="w-full" />
        </button>
      ))}
    </div>
  );
}

/** The pictures picked so far (four places), with "Undo". */
export function PickedPictures({ picked, onUndo }: { picked: PictureKey[]; onUndo: () => void }) {
  const t = useTranslations('pictures');
  return (
    <div className="flex items-center gap-3">
      <ol
        className="flex gap-2"
        dir="ltr"
        aria-label={t('picked', { count: String(picked.length) })}
      >
        {Array.from({ length: PICTURE_PASSWORD_LENGTH }, (_, index) => {
          const picture = picked[index];
          return (
            <li key={index}>
              {picture ? (
                <>
                  <PictureTile picture={picture} size="sm" />
                  <span className="sr-only">{t(picture)}</span>
                </>
              ) : (
                <span className="block size-10 rounded-row border-2 border-dashed border-line" />
              )}
            </li>
          );
        })}
      </ol>
      <span className="text-sm text-muted" aria-live="polite">
        {t('picked', { count: String(picked.length) })}
      </span>
      {picked.length ? (
        <button
          type="button"
          onClick={onUndo}
          className="ms-auto flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold text-brand-text hover:bg-ink/7"
        >
          <Icon name="undo" />
          {t('undo')}
        </button>
      ) : null}
    </div>
  );
}
