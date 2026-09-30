import { IsString, MaxLength, MinLength } from 'class-validator';

/** A staff action's reason, kept in the audit log. */
export class ReasonDto {
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason!: string;
}
