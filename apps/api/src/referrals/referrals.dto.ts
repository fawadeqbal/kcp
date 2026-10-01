import { ApiProperty } from '@nestjs/swagger';

export type ReferralStatusValue = 'PENDING' | 'REWARDED' | 'NOT_REWARDED';

/** One family the parent invited (no names: only how it went). */
export class ReferralItemDto {
  @ApiProperty({ enum: ['PENDING', 'REWARDED', 'NOT_REWARDED'] })
  status!: ReferralStatusValue;
  /** Why there was no reward: SAME_NETWORK, SAME_FAMILY, YEARLY_LIMIT, NO_CHILDREN, REFERRER_GONE. */
  reason!: string | null;
  rewardDays!: number | null;
  createdAt!: Date;
  decidedAt!: Date | null;
}

export class ReferralSummaryDto {
  code!: string;
  /** The invite link: the sign-up page with the code. */
  link!: string;
  /** Premium days each child gets per rewarded invitation. */
  rewardDays!: number;
  maxPerYear!: number;
  /** Rewarded invitations in the last 365 days. */
  rewardedThisYear!: number;
  invitations!: ReferralItemDto[];
}
