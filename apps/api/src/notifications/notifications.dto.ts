import { ArrayMaxSize, IsArray, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class NotificationDto {
  id!: string;
  /** badge_earned, certificate_issued, payment_receipt, payment_failed, plan_ended,
   * trial_ending, child_shipped or child_certificate. */
  type!: string;
  /** Keys and IDs the message needs, e.g. { "badgeKey": "first-ship" }. */
  data!: Record<string, unknown>;
  read!: boolean;
  createdAt!: Date;
}

export class NotificationListDto {
  unread!: number;
  items!: NotificationDto[];
}

export class MarkReadDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  ids?: string[];

  /** Marks every notification read. */
  @IsOptional()
  @IsBoolean()
  all?: boolean;
}
