import { IsString, MaxLength } from 'class-validator';

export class DeleteAccountDto {
  /** The parent's password, to confirm. */
  @IsString()
  @MaxLength(128)
  password!: string;
}
