import { BADGES } from '@kcp/shared';

/** The badge catalog from @kcp/shared, as rows for the badges table. */
export const badges = BADGES.map((badge, index) => ({
  key: badge.key,
  category: badge.category,
  icon: badge.icon,
  criteria: badge.criteria,
  sortOrder: index,
}));
