import { Body, Controller, ForbiddenException, Get, Put } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { Authenticated, CurrentUser } from '../permissions/permission.decorators.js';
import { EmailPreferencesDto } from './family-emails.dto.js';

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
      select: { monthlySummaryEmails: true },
    });
    return { monthlySummary: account.monthlySummaryEmails };
  }

  @Put()
  @Authenticated()
  @ApiOkResponse({ type: EmailPreferencesDto })
  async update(
    @Body() dto: EmailPreferencesDto,
    @CurrentUser() user: AuthUser,
  ): Promise<EmailPreferencesDto> {
    this.assertAdult(user);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { monthlySummaryEmails: dto.monthlySummary },
    });
    return { monthlySummary: dto.monthlySummary };
  }
}
