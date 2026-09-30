import { Transform } from 'class-transformer';
import { IsIn, IsString, Matches } from 'class-validator';

/** A Firebase Cloud Messaging registration token (letters, digits, - _ : .). */
const FCM_TOKEN = /^[\w:.-]{20,4096}$/;

export class RegisterDeviceDto {
  /** The phone's Firebase Cloud Messaging token. */
  @IsString()
  @Matches(FCM_TOKEN, { message: 'That doesn’t look like a push token.' })
  token!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase() : value))
  @IsIn(['android', 'ios'])
  platform!: 'android' | 'ios';

  /** The app's language (en, ar or ur): notifications are written in it. */
  @IsIn(['en', 'ar', 'ur'])
  language!: string;
}

export class RemoveDeviceDto {
  @IsString()
  @Matches(FCM_TOKEN, { message: 'That doesn’t look like a push token.' })
  token!: string;
}
