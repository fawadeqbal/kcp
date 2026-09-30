import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { BillingModule } from '../billing/billing.module.js';
import { ChildrenModule } from '../children/children.module.js';
import { AccountController } from './account.controller.js';
import { AccountService } from './account.service.js';

/** A parent's own data: download a copy, or delete the account. */
@Module({
  imports: [AuthModule, BillingModule, ChildrenModule],
  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule {}
