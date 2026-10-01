import { clsx } from 'clsx';

/**
 * Bit, the Explorer robot (our own character; the stage draws the same robot). Pass
 * `label` where Bit stands for something; otherwise Bit is decoration.
 */
export function Mascot({ className, label }: { className?: string; label?: string }) {
  const ink = '#1d3b4f';
  return (
    <svg
      viewBox="0 0 10 10"
      className={clsx('shrink-0', className ?? 'size-16')}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <line x1="5" y1="1.6" x2="5" y2="2.8" stroke={ink} strokeWidth="0.45" />
      <circle cx="5" cy="1.4" r="0.7" fill="#f2a93b" stroke={ink} strokeWidth="0.35" />
      <rect
        x="2"
        y="2.8"
        width="6"
        height="5"
        rx="1.5"
        fill="#2fa39a"
        stroke={ink}
        strokeWidth="0.45"
      />
      <rect x="2.9" y="3.7" width="4.2" height="2.4" rx="0.9" fill="#e9fbf7" />
      <circle cx="4.4" cy="4.9" r="0.5" fill={ink} />
      <circle cx="6.2" cy="4.9" r="0.5" fill={ink} />
      <path
        d="M4.2 6.9 Q5 7.4 5.8 6.9"
        fill="none"
        stroke={ink}
        strokeWidth="0.4"
        strokeLinecap="round"
      />
      <rect x="2.4" y="7.8" width="1.8" height="1.2" rx="0.5" fill={ink} />
      <rect x="5.8" y="7.8" width="1.8" height="1.2" rx="0.5" fill={ink} />
    </svg>
  );
}
