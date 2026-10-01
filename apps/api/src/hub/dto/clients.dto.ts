import { ApiProperty } from '@nestjs/swagger';
import {
  Equals,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const HUB_BUDGETS = ['UNDER_500', 'FROM_500', 'FROM_2000', 'FROM_5000', 'UNSURE'] as const;
export type HubBudgetValue = (typeof HUB_BUDGETS)[number];
export const INTAKE_STATUSES = ['UNCONFIRMED', 'NEW', 'ACCEPTED', 'DECLINED'] as const;
export type IntakeStatusValue = (typeof INTAKE_STATUSES)[number];
/** Currencies a project can be priced in. */
export const HUB_CURRENCIES = ['USD', 'PKR', 'EGP', 'AED', 'SAR'] as const;

/** A project request from the "Hire our students" page (no account). */
export class PublicIntakeDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  contactName!: string;

  @IsEmail()
  @MaxLength(254)
  contactEmail!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  company!: string;

  @IsOptional()
  @Matches(/^[A-Z]{2}$/)
  countryCode?: string;

  @IsIn(['en', 'ar', 'ur'])
  languageCode!: 'en' | 'ar' | 'ur';

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title!: string;

  /** What they need, in plain words. */
  @IsString()
  @MinLength(30)
  @MaxLength(5000)
  brief!: string;

  @IsIn(HUB_BUDGETS)
  budget!: HubBudgetValue;

  @IsOptional()
  @IsDateString({ strict: true })
  deadline?: string;

  /** Left empty by people; bots fill it in (the request is then dropped quietly). */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}

export class ConfirmIntakeDto {
  @IsString()
  @Length(20, 200)
  token!: string;
}

/** A project request from a signed-in client (their organisation is known). */
export class CreateIntakeDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(30)
  @MaxLength(5000)
  brief!: string;

  @IsIn(HUB_BUDGETS)
  budget!: HubBudgetValue;

  @IsOptional()
  @IsDateString({ strict: true })
  deadline?: string;
}

export class IntakeFileDto {
  id!: string;
  name!: string;
  /** Bytes. */
  size!: number;
  type!: string;
}

export class IntakeDto {
  id!: string;
  /** "R-0042". */
  reference!: string;
  @ApiProperty({ enum: ['SITE', 'PORTAL'] })
  source!: 'SITE' | 'PORTAL';
  @ApiProperty({ enum: INTAKE_STATUSES })
  status!: IntakeStatusValue;
  title!: string;
  brief!: string;
  @ApiProperty({ enum: HUB_BUDGETS })
  budget!: HubBudgetValue;
  deadline!: string | null;
  @ApiProperty({ type: [IntakeFileDto] })
  files!: IntakeFileDto[];
  createdAt!: Date;
  decidedAt!: Date | null;
  /** Shown to the client when declined. */
  declineReason!: string | null;
  /** The project made from it, once accepted. */
  projectId!: string | null;
}

/** An intake as staff see it: with the contact and organisation. */
export class AdminIntakeDto extends IntakeDto {
  contactName!: string;
  contactEmail!: string;
  company!: string;
  countryCode!: string | null;
  languageCode!: string;
  orgId!: string | null;
  orgName!: string | null;
  decidedBy!: string | null;
}

export class IntakeListQueryDto {
  @IsOptional()
  @IsIn(INTAKE_STATUSES)
  status?: IntakeStatusValue;
}

export class AcceptIntakeDto {
  /** The lead developer who scopes and leads it. */
  @IsUUID()
  leadId!: string;

  @IsIn(HUB_CURRENCIES)
  currency!: (typeof HUB_CURRENCIES)[number];

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title?: string;

  /** An existing client organisation (a returning client from the site). */
  @IsOptional()
  @IsUUID()
  orgId?: string;

  /** For a new organisation: its name (default: the company on the request) and country. */
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  orgName?: string;

  @IsOptional()
  @Matches(/^[A-Z]{2}$/)
  countryCode?: string;

  /** Part of the main quote invoiced before work starts (default 30). */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  depositPercent?: number;
}

export class DeclineIntakeDto {
  /** Sent to the client. */
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;
}

export class AcceptedIntakeDto {
  projectId!: string;
  orgId!: string;
  /** A new client account was invited (they choose a password from the email). */
  invited!: boolean;
}

export class ClientContractDto {
  version!: string;
  signedAt!: Date;
  signedBy!: string;
}

export class ClientOrgDto {
  id!: string;
  name!: string;
  countryCode!: string;
  billingName!: string | null;
  billingAddress!: string | null;
  taxId!: string | null;
  @ApiProperty({ enum: ['ACTIVE', 'SUSPENDED'] })
  status!: 'ACTIVE' | 'SUSPENDED';
  /** Null until the client agreement is signed. */
  contract!: ClientContractDto | null;
}

export class ClientColleagueDto {
  id!: string;
  name!: string;
  email!: string;
  @ApiProperty({ enum: ['OWNER', 'MEMBER'] })
  role!: 'OWNER' | 'MEMBER';
  /** Hasn't chosen a password yet. */
  invited!: boolean;
}

/** The signed-in client: their organisation, role and colleagues. */
export class ClientMeDto {
  org!: ClientOrgDto;
  @ApiProperty({ enum: ['OWNER', 'MEMBER'] })
  role!: 'OWNER' | 'MEMBER';
  /** The client agreement's current version: sign it (again) when it differs. */
  agreementVersion!: string;
  needsAgreement!: boolean;
  @ApiProperty({ type: [ClientColleagueDto] })
  colleagues!: ClientColleagueDto[];
}

export class SignClientAgreementDto {
  @IsString()
  @MaxLength(20)
  version!: string;

  @IsBoolean()
  @Equals(true)
  agree!: boolean;
}

export class UpdateClientOrgDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  billingName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  billingAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  taxId?: string;
}

export class InviteColleagueDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName!: string;
}

/** A client organisation, for staff. */
export class AdminClientDto extends ClientOrgDto {
  createdAt!: Date;
  @ApiProperty({ type: [ClientColleagueDto] })
  people!: ClientColleagueDto[];
  projects!: number;
  intakes!: number;
}

/** A lead developer staff can give a project to. */
export class HubLeadDto {
  id!: string;
  name!: string;
  /** Projects they lead that aren't finished. */
  openProjects!: number;
}
