import { Icon, type IconName } from '@kcp/ui';
import { clsx } from 'clsx';

/*
 * The site's icons: the same rounded Lucide set as the apps (@kcp/ui), 20px unless a
 * class says otherwise. They are decorative: the text next to them says the same
 * thing, so screen readers skip them. Arrows and chevrons turn round in Arabic and Urdu.
 */
type IconProps = { className?: string };

const icon = (name: IconName) =>
  function SiteIcon({ className }: IconProps) {
    return <Icon name={name} className={clsx('size-5', className)} />;
  };

export const CheckIcon = icon('check');
/** Points forward in the reading direction: right in English, left in Arabic and Urdu. */
export const ArrowIcon = icon('arrow');
/** Points back against the reading direction (for "All posts"). */
export const BackIcon = icon('chevL');
export const MenuIcon = icon('menu');
export const CloseIcon = icon('x');
export const ChevronIcon = icon('chevD');
export const ShieldIcon = icon('shield');
export const MaskIcon = icon('user');
export const NoChatIcon = icon('msg');
export const TrophyIcon = icon('trophy');
export const BoxIcon = icon('box');
export const LockIcon = icon('lock');
export const BanIcon = icon('ban');
export const UserPlusIcon = icon('userPlus');
export const UsersIcon = icon('users');
export const CodeIcon = icon('code');
export const StarIcon = icon('star');
export const PlayIcon = icon('play');
export const BookIcon = icon('book');
export const GlobeIcon = icon('globe');
export const CalendarIcon = icon('calendar');
export const HeartIcon = icon('heart');
export const CardIcon = icon('card');
export const ChartIcon = icon('chart');
export const FlameIcon = icon('flame');

/** The product mark: a terracotta circle with the code brackets (as in the apps). */
export { LogoMark } from '@kcp/ui';
