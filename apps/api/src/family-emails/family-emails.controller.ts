import { Body, Controller, ForbiddenException, Get, Put } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { Authenticated, CurrentUser } from '../permissions/permission.decorators.js';
import { EmailPreferencesDto, UpdateEmailPreferencesDto } from './family-emails.dto.js';

/** Which optional emails a parent gets (receipts and security emails always go). */
@ApiTags('account')
@Controller('account/email-preferences')
export class FamilyEmailsController {
  constructor(private readonly prisma: PrismaService) {}

  private assertAdult(user: AuthUser) {
    if (user.kind !== 'ADULT') {
      throw new ForbiddenException({
        error: 'ADULTS_ONLY',
        message: 'Only parents get these emails.',
      });
    }
  }

  @Get()
  @Authenticated()
  @ApiOkResponse({ type: EmailPreferencesDto })
  async get(@CurrentUser() user: AuthUser): Promise<EmailPreferencesDto> {
    this.assertAdult(user);
    const account = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { monthlySummaryEmails: true, weeklyReportEmails: true },
    });
    return {
      monthlySummary: account.monthlySummaryEmails,
      weeklyReport: account.weeklyReportEmails,
    };
  }

  @Put()
  @Authenticated()
  @ApiOkResponse({ type: EmailPreferencesDto })
  async update(
    @Body() dto: UpdateEmailPreferencesDto,
    @CurrentUser() user: AuthUser,
  ): Promise<EmailPreferencesDto> {
    this.assertAdult(user);
    const account = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        ...(dto.monthlySummary === undefined ? {} : { monthlySummaryEmails: dto.monthlySummary }),
        ...(dto.weeklyReport === undefined ? {} : { weeklyReportEmails: dto.weeklyReport }),
      },
      select: { monthlySummaryEmails: true, weeklyReportEmails: true },
    });
    return {
      monthlySummary: account.monthlySummaryEmails,
      weeklyReport: account.weeklyReportEmails,
    };
  }
}
