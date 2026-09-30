import type { AvatarKey } from '@kcp/shared';

/**
 * Background colour of each preset avatar. The icon on top is white, so every colour
 * must keep at least 4.5:1 contrast with white (checked in avatar-colors.spec.ts).
 */
export const AVATAR_COLORS: Record<AvatarKey, string> = {
  rocket: '#4f46e5',
  star: '#b45309',
  bolt: '#7c3aed',
  planet: '#0e7490',
  robot: '#475569',
  leaf: '#15803d',
  moon: '#1e3a8a',
  sun: '#c2410c',
  cube: '#be185d',
  gamepad: '#0f766e',
  music: '#9333ea',
  code: '#1d4ed8',
};

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r = 0, g = 0, b = 0] = channels.map((c) =>
    c <= 0.039_28 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two #rrggbb colours (1 to 21). */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].toSorted((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}
