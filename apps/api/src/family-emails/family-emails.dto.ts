import { IsBoolean } from 'class-validator';

export class EmailPreferencesDto {
  /** The monthly email about the children's progress. */
  @IsBoolean()
  monthlySummary!: boolean;
}
