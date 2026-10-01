import { IsBoolean, IsOptional } from 'class-validator';

export class EmailPreferencesDto {
  /** The monthly email about the children's progress. */
  @IsBoolean()
  monthlySummary!: boolean;

  /** The weekly report on Sunday evenings. */
  @IsBoolean()
  weeklyReport!: boolean;
}

/** Changes one or both; what isn't sent stays as it was. */
export class UpdateEmailPreferencesDto {
  @IsOptional()
  @IsBoolean()
  monthlySummary?: boolean;

  @IsOptional()
  @IsBoolean()
  weeklyReport?: boolean;
}
