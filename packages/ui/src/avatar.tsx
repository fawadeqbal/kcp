'use client';

import { AVATAR_KEYS, type AvatarKey, isAvatarKey } from '@kcp/shared';
import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { AVATAR_COLORS } from './avatar-colors.js';

/*
 * Preset avatars: a white icon on a coloured circle, drawn on a 48×48 grid.
 * Children never upload photos, so these are the only pictures of a child anywhere.
 */

const W = '#ffffff';
const stroke = {
  fill: 'none',
  stroke: W,
  strokeWidth: 3,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

function art(key: AvatarKey, bg: string): ReactNode {
  switch (key) {
    case 'rocket':
      return (
        <>
          <path fill={W} d="M24 7c5.5 4.5 8 11 8 17.5V31H16v-6.5C16 18 18.5 11.5 24 7z" />
          <circle cx="24" cy="19" r="3.2" fill={bg} />
          <path fill={W} d="M16 24l-5 7.5V35h5zM32 24l5 7.5V35h-5z" />
          <path fill={W} d="M20.5 33h7L24 41z" opacity="0.8" />
        </>
      );
    case 'star':
      return (
        <path
          fill={W}
          d="M24 8l4.7 10.5 11.3 1.1-8.6 7.4 2.6 11-10-5.8-10 5.8 2.6-11L8 19.6l11.3-1.1z"
        />
      );
    case 'bolt':
      return <path fill={W} d="M27 7L13 27h9l-3 14 16-21h-9z" />;
    case 'planet':
      return (
        <>
          <circle cx="24" cy="24" r="9" fill={W} />
          <ellipse
            cx="24"
            cy="24"
            rx="17"
            ry="5.5"
            transform="rotate(-24 24 24)"
            {...stroke}
            strokeWidth={2.5}
          />
        </>
      );
    case 'robot':
      return (
        <>
          <path {...stroke} strokeWidth={2.5} d="M24 16v-5" />
          <circle cx="24" cy="10" r="2.4" fill={W} />
          <rect x="13" y="16" width="22" height="18" rx="4" fill={W} />
          <rect x="9.5" y="21" width="3.5" height="8" rx="1.75" fill={W} />
          <rect x="35" y="21" width="3.5" height="8" rx="1.75" fill={W} />
          <circle cx="19" cy="24" r="2.5" fill={bg} />
          <circle cx="29" cy="24" r="2.5" fill={bg} />
          <rect x="19" y="29" width="10" height="2" rx="1" fill={bg} />
        </>
      );
    case 'leaf':
      return (
        <>
          <path fill={W} d="M37 10C21 10 11 18 11 29c0 5 3 9 3 9s3-1 8-1c11 0 16-10 15-27z" />
          <path {...stroke} stroke={bg} strokeWidth={2.2} d="M15 36c5-9 11-15 17-20" />
        </>
      );
    case 'moon':
      return (
        <>
          <path fill={W} d="M30 9a15 15 0 1 0 9 24 12.5 12.5 0 0 1-9-24z" />
          <circle cx="36" cy="13" r="1.6" fill={W} />
        </>
      );
    case 'sun':
      return (
        <>
          <circle cx="24" cy="24" r="7.5" fill={W} />
          <path
            {...stroke}
            d="M24 8.5v4M24 35.5v4M8.5 24h4M35.5 24h4M13 13l2.8 2.8M32.2 32.2L35 35M13 35l2.8-2.8M32.2 15.8L35 13"
          />
        </>
      );
    case 'cube':
      return (
        <>
          <path fill={W} d="M24 9l12.5 7L24 23l-12.5-7z" />
          <path fill={W} opacity="0.8" d="M11.5 18.5l11 6.2V39l-11-6.3z" />
          <path fill={W} opacity="0.6" d="M36.5 18.5v14.2l-11 6.3V24.7z" />
        </>
      );
    case 'gamepad':
      return (
        <>
          <path
            fill={W}
            d="M15 16h18a7 7 0 0 1 6.9 5.9l1.5 9.4a4 4 0 0 1-7 3.2L31 30H17l-3.4 4.5a4 4 0 0 1-7-3.2l1.5-9.4A7 7 0 0 1 15 16z"
          />
          <path fill={bg} d="M15 20.5h2.5v3h3V26h-3v3H15v-3h-3v-2.5h3z" />
          <circle cx="31" cy="22.5" r="1.8" fill={bg} />
          <circle cx="34.5" cy="26.5" r="1.8" fill={bg} />
        </>
      );
    case 'music':
      return (
        <path
          fill={W}
          d="M19 13.5L36 9v20.5a4.8 4.8 0 1 1-2.6-4.3V15.2l-11.8 3.1v14.2a4.8 4.8 0 1 1-2.6-4.3z"
        />
      );
    case 'code':
      return <path {...stroke} strokeWidth={3.2} d="M17 15l-8 9 8 9M31 15l8 9-8 9M27 11l-6 26" />;
  }
}

const SIZES = {
  sm: 'size-8',
  md: 'size-12',
  lg: 'size-16',
  xl: 'size-18',
  hero: 'size-21',
} as const;

/**
 * A child's avatar. Decorative by default (the nickname is always shown next to it);
 * pass `label` when the avatar stands on its own.
 */
export function Avatar({
  avatarKey,
  size = 'md',
  label,
  className,
}: {
  avatarKey: string;
  size?: keyof typeof SIZES;
  label?: string;
  className?: string;
}) {
  const key: AvatarKey = isAvatarKey(avatarKey) ? avatarKey : 'rocket';
  const bg = AVATAR_COLORS[key];
  return (
    <svg
      viewBox="0 0 48 48"
      className={clsx('shrink-0 rounded-full', SIZES[size], className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <circle cx="24" cy="24" r="24" fill={bg} />
      {art(key, bg)}
    </svg>
  );
}

/**
 * Radio group of the preset avatars. Arrow keys move between them, as in any radio group.
 */
export function AvatarPicker({
  legend,
  value,
  onChange,
  labels,
  name = 'avatar',
  error,
}: {
  legend: string;
  value: string;
  onChange: (key: AvatarKey) => void;
  /** Accessible name of each avatar, e.g. { rocket: "Rocket" }. */
  labels: Record<AvatarKey, string>;
  name?: string;
  error?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-sm font-semibold">{legend}</legend>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
        {AVATAR_KEYS.map((key) => (
          <label
            key={key}
            className={clsx(
              'relative flex cursor-pointer flex-col items-center gap-1 rounded-row border-2 p-2 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand has-[:focus-visible]:outline-solid',
              value === key ? 'border-primary bg-brand-100' : 'border-transparent hover:bg-raised',
            )}
          >
            <input
              type="radio"
              name={name}
              value={key}
              checked={value === key}
              onChange={() => onChange(key)}
              // Invisible but covering the whole tile, so a click anywhere selects it.
              className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0"
            />
            <Avatar avatarKey={key} size="lg" />
            <span className="text-center text-sm">{labels[key]}</span>
          </label>
        ))}
      </div>
      {error ? (
        <p className="text-sm font-semibold text-danger-text" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
