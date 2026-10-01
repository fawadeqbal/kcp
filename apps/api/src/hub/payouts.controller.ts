import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ReqContext, type RequestContext } from '../common/request-context.js';
import type { AuthUser } from '../permissions/auth-user.js';
import type { AppAbility } from '../permissions/ability.factory.js';
import { Can, CurrentAbility, CurrentUser, Public } from '../permissions/permission.decorators.js';
import {
  AdminPayoutAccountDto,
  CancelPayoutDto,
  CreateBatchDto,
  CurrencyQueryDto,
  EarningsStatementDto,
  LeadEarningsDto,
  LeadPayableDto,
  LedgerQueryDto,
  LedgerTransactionDto,
  PasswordDto,
  PayLeadDto,
  PayoutAccountDetailsDto,
  PayoutAccountDto,
  PayoutAccountListQueryDto,
  PayoutBatchDetailDto,
  PayoutBatchDto,
  PayoutDto,
  ReadyToPayDto,
  RecordPayoutDto,
  SettlePayoutDto,
  SetPayoutAccountDto,
  TrialBalanceDto,
} from './dto/payouts.dto.js';
import { HubEarningsService } from './earnings.service.js';
import { LedgerService } from './ledger/ledger.service.js';
import { PayoutAccountsService } from './payout-accounts.service.js';
import { PayoutsService } from './payouts.service.js';

const uuid = () => new ParseUUIDPipe();

/** Students, parents and lead developers: earnings, payout accounts and payouts. */
@ApiTags('hub')
@Controller()
export class EarningsController {
  constructor(
    private readonly earnings: HubEarningsService,
    private readonly accounts: PayoutAccountsService,
    private readonly payouts: PayoutsService,
  ) {}

  /** The student's own earnings (paid to their parent). */
  @Get('hub/earnings')
  @Can('read', 'HubEarnings')
  @ApiOkResponse({ type: EarningsStatementDto })
  mine(@CurrentUser() user: AuthUser): Promise<EarningsStatementDto> {
    return this.earnings.forStudent(user);
  }

  /** A child's statement, for their parent. */
  @Get('children/:childId/hub/earnings')
  @Can('read', 'HubEarnings')
  @ApiOkResponse({ type: EarningsStatementDto })
  child(
    @Param('childId', uuid()) childId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<EarningsStatementDto> {
    return this.earnings.forChild(user, childId);
  }

  @Get('mentor/hub/earnings')
  @Can('read', 'HubProject')
  @ApiOkResponse({ type: LeadEarningsDto })
  lead(@CurrentUser() user: AuthUser): Promise<LeadEarningsDto> {
    return this.earnings.forLead(user);
  }

  @Get('payout-account')
  @Can('read', 'PayoutAccount')
  @ApiOkResponse({ type: PayoutAccountDto })
  account(@CurrentUser() user: AuthUser): Promise<PayoutAccountDto | null> {
    return this.accounts.get(user);
  }

  /** Sets or changes the parent's payout account (password needed; 48 hours before use). */
  @Put('payout-account')
  @Can('create', 'PayoutAccount')
  @ApiOkResponse({ type: PayoutAccountDto })
  setAccount(
    @Body() dto: SetPayoutAccountDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<PayoutAccountDto> {
    return this.accounts.set(user, dto, ctx);
  }

  @Post('payout-account/remove')
  @Can('delete', 'PayoutAccount')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async removeAccount(
    @Body() dto: PasswordDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.accounts.remove(user, dto.password, ctx);
  }

  @Get('payouts')
  @Can('read', 'Payout')
  @ApiOkResponse({ type: [PayoutDto] })
  list(@CurrentUser() user: AuthUser): Promise<PayoutDto[]> {
    return this.payouts.forParent(user);
  }

  @Post('payouts/:id/confirm')
  @Can('update', 'Payout')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: [PayoutDto] })
  confirm(
    @Param('id', uuid()) id: string,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<PayoutDto[]> {
    return this.payouts.confirm(user, id, ctx);
  }

  @Post('payouts/:id/decline')
  @Can('update', 'Payout')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: [PayoutDto] })
  decline(
    @Param('id', uuid()) id: string,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<PayoutDto[]> {
    return this.payouts.decline(user, id, ctx);
  }
}

/** Wise's webhooks (transfer state changes). The body is kept raw for the signature. */
@ApiTags('hub')
@Controller('payouts/webhooks')
export class PayoutWebhooksController {
  constructor(private readonly payouts: PayoutsService) {}

  @Post('wise')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async wise(
    @Req() req: Request,
    @Headers('x-signature-sha256') signature: string | undefined,
  ): Promise<{ received: true }> {
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    await this.payouts.webhook(body, signature ?? '');
    return { received: true };
  }
}

/** Staff: payout batches, payout accounts, lead developers' pay and the ledger. */
@ApiTags('hub')
@Controller('admin/hub')
export class PayoutsAdminController {
  constructor(
    private readonly payouts: PayoutsService,
    private readonly accounts: PayoutAccountsService,
    private readonly ledger: LedgerService,
  ) {}

  @Get('payouts/ready')
  @Can('read', 'Payout', { onAll: true })
  @ApiOkResponse({ type: [ReadyToPayDto] })
  ready(@Query() query: CurrencyQueryDto): Promise<ReadyToPayDto[]> {
    return this.payouts.ready(query.currency);
  }

  @Get('payouts/batches')
  @Can('read', 'Payout', { onAll: true })
  @ApiOkResponse({ type: [PayoutBatchDto] })
  batches(): Promise<PayoutBatchDto[]> {
    return this.payouts.batches();
  }

  @Post('payouts/batches')
  @Can('create', 'Payout', { onAll: true })
  @ApiOkResponse({ type: PayoutBatchDetailDto })
  create(
    @Body() dto: CreateBatchDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<PayoutBatchDetailDto> {
    return this.payouts.createBatch(user, dto, ctx);
  }

  @Get('payouts/batches/:id')
  @Can('read', 'Payout', { onAll: true })
  @ApiOkResponse({ type: PayoutBatchDetailDto })
  batch(@Param('id', uuid()) id: string): Promise<PayoutBatchDetailDto> {
    return this.payouts.batch(id);
  }

  /** Super admins only: two different ones approve a batch. */
  @Post('payouts/batches/:id/approve')
  @Can('update', 'Payout', { onAll: true })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: PayoutBatchDetailDto })
  approve(
    @Param('id', uuid()) id: string,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<PayoutBatchDetailDto> {
    return this.payouts.approve(user, id, ctx);
  }

  /** Super admins only, with the hub_payouts flag on. */
  @Post('payouts/batches/:id/send')
  @Can('update', 'Payout', { onAll: true })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: PayoutBatchDetailDto })
  send(
    @Param('id', uuid()) id: string,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<PayoutBatchDetailDto> {
    return this.payouts.send(user, id, ctx);
  }

  @Post('payouts/batches/:id/cancel')
  @Can('update', 'Payout', { onAll: true })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: PayoutBatchDetailDto })
  cancelBatch(
    @Param('id', uuid()) id: string,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<PayoutBatchDetailDto> {
    return this.payouts.cancelBatch(user, id, ctx);
  }

  /** Manual batches: a payout staff paid outside the platform. */
  @Post('payouts/:id/record')
  @Can('update', 'Payout', { onAll: true })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: PayoutBatchDetailDto })
  record(
    @Param('id', uuid()) id: string,
    @Body() dto: RecordPayoutDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<PayoutBatchDetailDto> {
    return this.payouts.record(user, id, dto, ctx);
  }

  /** A payout stuck in "sending": a super admin says what Wise shows for it. */
  @Post('payouts/:id/settle')
  @Can('update', 'Payout', { onAll: true })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: PayoutBatchDetailDto })
  settle(
    @Param('id', uuid()) id: string,
    @Body() dto: SettlePayoutDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<PayoutBatchDetailDto> {
    return this.payouts.settle(user, id, dto, ctx);
  }

  @Post('payouts/:id/cancel')
  @Can('update', 'Payout', { onAll: true })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: PayoutBatchDetailDto })
  cancel(
    @Param('id', uuid()) id: string,
    @Body() dto: CancelPayoutDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<PayoutBatchDetailDto> {
    return this.payouts.cancelPayout(user, id, dto.reason, ctx);
  }

  @Get('payout-accounts')
  @Can('read', 'PayoutAccount', { onAll: true })
  @ApiOkResponse({ type: [AdminPayoutAccountDto] })
  accountList(@Query() query: PayoutAccountListQueryDto): Promise<AdminPayoutAccountDto[]> {
    return this.accounts.list(query.show ?? 'waiting');
  }

  /** The full account details (each look is in the audit log). */
  @Get('payout-accounts/:id/details')
  @Can('read', 'PayoutAccount', { onAll: true })
  @ApiOkResponse({ type: PayoutAccountDetailsDto })
  reveal(
    @Param('id', uuid()) id: string,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<PayoutAccountDetailsDto> {
    return this.accounts.reveal(user, id, ctx);
  }

  @Post('payout-accounts/:id/verify')
  // Staff only (they read every account), with the field "verified": checked here.
  @Can('read', 'PayoutAccount', { onAll: true })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AdminPayoutAccountDto })
  verify(
    @Param('id', uuid()) id: string,
    @CurrentUser() user: AuthUser,
    @CurrentAbility() ability: AppAbility,
    @ReqContext() ctx: RequestContext,
  ): Promise<AdminPayoutAccountDto> {
    if (!ability.can('update', 'PayoutAccount', 'verified')) {
      throw new ForbiddenException({
        error: 'FORBIDDEN',
        message: 'You can’t check payout accounts.',
      });
    }
    return this.accounts.verify(user, id, ctx);
  }

  @Get('leads/payable')
  @Can('read', 'Ledger', { onAll: true })
  @ApiOkResponse({ type: [LeadPayableDto] })
  leads(): Promise<LeadPayableDto[]> {
    return this.payouts.leadsPayable();
  }

  /** A lead developer was paid by hand (with the hub_payouts flag on). */
  @Post('leads/:leadId/payments')
  @Can('create', 'Payout', { onAll: true })
  @ApiOkResponse({ type: [LeadPayableDto] })
  payLead(
    @Param('leadId', uuid()) leadId: string,
    @Body() dto: PayLeadDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<LeadPayableDto[]> {
    return this.payouts.payLead(user, leadId, dto, ctx);
  }

  @Get('ledger/trial-balance')
  @Can('read', 'Ledger', { onAll: true })
  @ApiOkResponse({ type: [TrialBalanceDto] })
  trialBalance(): Promise<TrialBalanceDto[]> {
    return this.ledger.trialBalance();
  }

  @Get('ledger/transactions')
  @Can('read', 'Ledger', { onAll: true })
  @ApiOkResponse({ type: [LedgerTransactionDto] })
  async transactions(@Query() query: LedgerQueryDto): Promise<LedgerTransactionDto[]> {
    const rows = await this.ledger.transactions({
      kind: query.kind,
      refId: query.refId,
      before: query.before ? new Date(query.before) : undefined,
    });
    return rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      memo: row.memo,
      currency: row.entries[0]?.currency ?? '',
      refType: row.refType,
      refId: row.refId,
      createdAt: row.createdAt,
      entries: row.entries.map((entry) => ({
        accountType: entry.account.type,
        owner: entry.account.ownerKey,
        side: entry.side,
        amountMinor: entry.amountMinor,
      })),
    }));
  }
}
