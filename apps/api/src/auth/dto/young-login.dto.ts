import { PICTURE_KEYS, PICTURE_PASSWORD_LENGTH } from '@kcp/shared';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import { TokenDeliveryDto } from './login.dto.js';

export class PictureLoginDto extends TokenDeliveryDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @Length(3, 60)
  username!: string;

  /** Four picture keys in the order the child tapped them. */
  @IsArray()
  @ArrayMinSize(PICTURE_PASSWORD_LENGTH)
  @ArrayMaxSize(PICTURE_PASSWORD_LENGTH)
  @IsIn([...PICTURE_KEYS], { each: true })
  pictures!: string[];
}

export class PairingStartDto {
  /** Which app shows the code (the mobile app keeps its tokens itself). */
  @IsIn(['web', 'mobile'])
  app!: 'web' | 'mobile';
}

export class PairingStartedDto {
  pairingId!: string;
  /** Shown on the child's device (and in its QR code), e.g. "K7MQ-4XPR". */
  code!: string;
  /** Only the device that asked holds it: it proves the device when claiming. */
  secret!: string;
  expiresAt!: Date;
}

export class PairingDeviceDto extends TokenDeliveryDto {
  @IsUUID()
  pairingId!: string;

  @IsString()
  @Length(20, 100)
  secret!: string;
}

export class PairingStatusDto {
  status!: 'waiting' | 'approved' | 'expired';
}

export class PairingCodeDto {
  /** What the parent typed or scanned; spaces and dashes don't matter. */
  @IsString()
  @Length(6, 20)
  code!: string;
}

export class PairingApproveDto extends PairingCodeDto {
  @IsUUID()
  childId!: string;
}

/** What a parent sees before approving: which device asked, and when. */
export class PairingInfoDto {
  /** The browser or app and system, e.g. "Chrome on Android". */
  device!: string;
  createdAt!: Date;
  expiresAt!: Date;
}
