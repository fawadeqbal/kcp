import { clsx } from 'clsx';
import type { ReactNode } from 'react';

/*
 * Small line icons drawn inline (no image files, no icon font). They are decorative:
 * the text next to them says the same thing, so screen readers skip them.
 */
function Icon({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={clsx('size-5 shrink-0', className)}
    >
      {children}
    </svg>
  );
}

type IconProps = { className?: string };

export const CheckIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M20 6 9 17l-5-5" />
  </Icon>
);

/** Points forward in the reading direction: right in English, left in Arabic and Urdu. */
export const ArrowIcon = ({ className }: IconProps) => (
  <Icon className={clsx('rtl:-scale-x-100', className)}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </Icon>
);

/** Points back against the reading direction (for "All posts"). */
export const BackIcon = ({ className }: IconProps) => (
  <Icon className={clsx('rtl:-scale-x-100', className)}>
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </Icon>
);

export const MenuIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Icon>
);

export const CloseIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Icon>
);

export const ChevronIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);

export const ShieldIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </Icon>
);

export const MaskIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Icon>
);

export const NoChatIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <path d="m3 3 18 18" />
  </Icon>
);

export const TrophyIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
    <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
  </Icon>
);

export const BoxIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M21 8 12 3 3 8v8l9 5 9-5V8z" />
    <path d="m3 8 9 5 9-5M12 13v8" />
  </Icon>
);

export const LockIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Icon>
);

export const BanIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="m5.6 5.6 12.8 12.8" />
  </Icon>
);

export const UserPlusIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <circle cx="10" cy="8" r="4" />
    <path d="M2 21a8 8 0 0 1 16 0" />
    <path d="M19 8v6M16 11h6" />
  </Icon>
);

export const CodeIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />
  </Icon>
);

export const StarIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
  </Icon>
);

export const PlayIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="m10 8 6 4-6 4z" />
  </Icon>
);

export const BookIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M2 5h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z" />
    <path d="M22 5h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z" />
  </Icon>
);

export const GlobeIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </Icon>
);

export const CalendarIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Icon>
);

export const HeartIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z" />
  </Icon>
);

export const CardIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
  </Icon>
);

export const ChartIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M3 3v18h18" />
    <path d="m7 15 4-4 3 3 5-6" />
  </Icon>
);

/** The site's mark: a rounded square with </> in it. */
export function LogoMark({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className={clsx('size-8 shrink-0', className)}
    >
      <rect width="32" height="32" rx="9" className="fill-brand-600" />
      <path
        d="m12 11-5 5 5 5M20 11l5 5-5 5"
        fill="none"
        stroke="white"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="2" className="fill-accent" />
    </svg>
  );
}
