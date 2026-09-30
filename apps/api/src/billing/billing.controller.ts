import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { byIp, RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import { ReqContext, type RequestContext } from '../common/request-context.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { Can, CurrentUser } from '../permissions/permission.decorators.js';
import { BillingService } from './billing.service.js';
import {
  BillingDto,
  ChangePlanDto,
  CheckoutDto,
  CheckoutResultDto,
  InvoiceDto,
  SubscriptionDto,
} from './dto/billing.dto.js';

const HOUR = 60 * 60;

/** A family's plan, from the parent's account. */
@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  /** The plan, prices in the family's currency, each child's premium, and invoices. */
  @Get()
  @Can('read', 'Billing')
  @ApiOkResponse({ type: BillingDto })
  overview(@CurrentUser() user: AuthUser): Promise<BillingDto> {
    return this.billing.overview(user);
  }

  /** Starts paying by card: returns Stripe's checkout page to send the parent to. */
  @Post('checkout')
  @Can('update', 'Billing')
  @RateLimit({ name: 'checkout-ip', limit: 20, windowSeconds: HOUR, key: byIp })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: CheckoutResultDto })
  checkout(
    @Body() dto: CheckoutDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<CheckoutResultDto> {
    return this.billing.checkout(user, dto.planKey, dto.locale, ctx);
  }

  /** Cancels at the end of the period: premium stays until then. */
  @Post('cancel')
  @Can('update', 'Billing')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: SubscriptionDto })
  cancel(
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<SubscriptionDto> {
    return this.billing.setCancelAtPeriodEnd(user, true, ctx);
  }

  /** Keeps a cancelled plan after all (before its period ends). */
  @Post('resume')
  @Can('update', 'Billing')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: SubscriptionDto })
  resume(
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<SubscriptionDto> {
    return this.billing.setCancelAtPeriodEnd(user, false, ctx);
  }

  /** Switches between monthly and yearly (card plans). */
  @Post('plan')
  @Can('update', 'Billing')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: SubscriptionDto })
  changePlan(
    @Body() dto: ChangePlanDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<SubscriptionDto> {
    return this.billing.changePlan(user, dto.planKey, ctx);
  }

  @Get('invoices/:id')
  @Can('read', 'Billing')
  @ApiOkResponse({ type: InvoiceDto })
  invoice(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<InvoiceDto> {
    return this.billing.invoice(id, user.id);
  }
}
