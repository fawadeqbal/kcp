import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ReqContext, type RequestContext } from '../common/request-context.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { Can, CurrentUser } from '../permissions/permission.decorators.js';
import { BillingService } from './billing.service.js';
import {
  BillingListQueryDto,
  CountryCodeParam,
  CountryPricesDto,
  FamilyBillingDto,
  InvoiceDto,
  ManualPaymentDto,
  PaymentAdminDto,
  PaymentListDto,
  PriceListDto,
  RefundDto,
  StaffCancelDto,
  SubscriptionAdminDto,
  SubscriptionListDto,
  UpdateCountryPricesDto,
} from './dto/billing.dto.js';
import { PaymentsAdminService } from './payments-admin.service.js';

/** Payments in the admin panel. Every change needs a reason and is audited. */
@ApiTags('admin')
@Controller('admin')
export class PaymentsAdminController {
  constructor(
    private readonly admin: PaymentsAdminService,
    private readonly billing: BillingService,
  ) {}

  @Get('billing/subscriptions')
  @Can('read', 'Payment', { onAll: true })
  @ApiOkResponse({ type: SubscriptionListDto })
  subscriptions(@Query() query: BillingListQueryDto): Promise<SubscriptionListDto> {
    return this.admin.subscriptions(query);
  }

  @Get('billing/payments')
  @Can('read', 'Payment', { onAll: true })
  @ApiOkResponse({ type: PaymentListDto })
  payments(@Query() query: BillingListQueryDto): Promise<PaymentListDto> {
    return this.admin.payments(query);
  }

  /** One family's plans, payments, invoices and payment events. */
  @Get('users/:id/billing')
  @Can('read', 'Payment', { onAll: true })
  @ApiOkResponse({ type: FamilyBillingDto })
  family(@Param('id', new ParseUUIDPipe()) id: string): Promise<FamilyBillingDto> {
    return this.admin.family(id);
  }

  /** A payment received another way (bank transfer, wallet, cash): premium for the family. */
  @Post('users/:id/manual-payments')
  @Can('create', 'Payment')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: FamilyBillingDto })
  manualPayment(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ManualPaymentDto,
    @CurrentUser() staff: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<FamilyBillingDto> {
    return this.admin.recordManualPayment(id, dto, staff, ctx);
  }

  /** Gives money back; a full refund ends the family's premium now. */
  @Post('billing/payments/:id/refunds')
  @Can('update', 'Payment')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: PaymentAdminDto })
  refund(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RefundDto,
    @CurrentUser() staff: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<PaymentAdminDto> {
    return this.admin.refund(id, dto.amountMinor, dto.reason, staff, ctx);
  }

  @Post('billing/subscriptions/:id/cancel')
  @Can('update', 'Payment')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: SubscriptionAdminDto })
  cancel(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: StaffCancelDto,
    @CurrentUser() staff: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<SubscriptionAdminDto> {
    return this.admin.cancel(id, dto.immediately, dto.reason, staff, ctx);
  }

  @Get('billing/invoices/:id')
  @Can('read', 'Payment', { onAll: true })
  @ApiOkResponse({ type: InvoiceDto })
  invoice(@Param('id', new ParseUUIDPipe()) id: string): Promise<InvoiceDto> {
    return this.billing.invoice(id, null);
  }

  /** Prices per country (per child) and each country's family discount. */
  @Get('prices')
  @Can('read', 'PlanPrice', { onAll: true })
  @ApiOkResponse({ type: PriceListDto })
  prices(): Promise<PriceListDto> {
    return this.admin.prices();
  }

  @Put('prices/:code')
  @Can('update', 'PlanPrice')
  @ApiOkResponse({ type: CountryPricesDto })
  updatePrices(
    @Param() params: CountryCodeParam,
    @Body() dto: UpdateCountryPricesDto,
    @CurrentUser() staff: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<CountryPricesDto> {
    return this.admin.updatePrices(params.code, dto, staff, ctx);
  }
}
