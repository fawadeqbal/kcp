/** Highest level for now; more are added when there is content to earn them. */
export const LEVEL_COUNT = 30;

/**
 * XP needed to reach a level: 0, 100, 250, 450, 700, 1000, … Each level needs
 * 50 XP more than the one before, so early levels come quickly (Module 1 alone is
 * worth about 300 XP) and later ones keep a steady pace.
 */
export const minXpForLevel = (level: number) => 25 * (level - 1) * (level + 2);

export const levels = Array.from({ length: LEVEL_COUNT }, (_, index) => ({
  number: index + 1,
  minXp: minXpForLevel(index + 1),
}));
