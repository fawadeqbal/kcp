import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CountryCodeParam {
  @Matches(/^[A-Z]{2}$/)
  code!: string;
}

export class LanguageCodeParam {
  @Matches(/^[a-z]{2}$/)
  code!: string;
}

export class FlagKeyParam {
  @Matches(/^[a-z0-9_]{1,60}$/)
  key!: string;
}

export class UpdateCountryDto {
  /** Families in this country can sign up (and see its prices). */
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** ISO 4217, e.g. "PKR". Only while the country is switched off; prices are set again after. */
  @IsOptional()
  @Matches(/^[A-Z]{3}$/)
  currency?: string;
}

export class CountryAdminDto {
  code!: string;
  isActive!: boolean;
  currency!: string;
}

export class LanguageAdminDto {
  code!: string;
  name!: string;
  nativeName!: string;
  direction!: 'LTR' | 'RTL';
  isActive!: boolean;
  /** Accounts using it (their emails and pages are in this language). */
  accounts!: number;
  /** Lessons written in it. */
  lessons!: number;
}

export class LanguageListDto {
  languages!: LanguageAdminDto[];
}

export class UpdateLanguageDto {
  @IsBoolean()
  isActive!: boolean;
}

export class FeatureFlagDto {
  key!: string;
  description!: string | null;
  enabled!: boolean;
  /** Empty = every country. */
  countryCodes!: string[];
  updatedAt!: Date;
  /** Who changed it last (staff name), if anyone has. */
  updatedBy!: string | null;
}

export class FeatureFlagListDto {
  flags!: FeatureFlagDto[];
}

export class UpdateFeatureFlagDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  /** Only these countries; an empty list = every country. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(250)
  @Matches(/^[A-Z]{2}$/, { each: true })
  countryCodes?: string[];

  /** Kept in the audit log. */
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason!: string;
}
