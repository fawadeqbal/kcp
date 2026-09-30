import { AVATAR_KEYS } from '@kcp/shared';
import { AVATAR_COLORS, contrastRatio } from './avatar-colors.js';

describe('avatar colours', () => {
  it('has a colour for every preset avatar', () => {
    expect(Object.keys(AVATAR_COLORS).toSorted()).toEqual([...AVATAR_KEYS].toSorted());
  });

  it('keeps the white icon readable on every background (WCAG 4.5:1)', () => {
    const tooLight = Object.entries(AVATAR_COLORS).filter(
      ([, color]) => contrastRatio(color, '#ffffff') < 4.5,
    );
    expect(tooLight).toEqual([]);
  });

  it('computes contrast ratios like WCAG', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });
});
