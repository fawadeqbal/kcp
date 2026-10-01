import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ReqContext, type RequestContext } from '../common/request-context.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { Can, CurrentUser } from '../permissions/permission.decorators.js';
import {
  ConsentDecisionDto,
  ConsentQueueDto,
  ConsentQueueQueryDto,
} from './parental-consent.dto.js';
import { ParentalConsentService } from './parental-consent.service.js';

/** Admin → Parental consent: signed forms from parents of under-13s, to approve or reject. */
@ApiTags('admin')
@Controller('admin/parental-consents')
export class ParentalConsentAdminController {
  constructor(
    private readonly consent: ParentalConsentService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @Can('read', 'ParentalConsent', { onAll: true })
  @ApiOkResponse({ type: ConsentQueueDto })
  async list(@Query() query: ConsentQueueQueryDto): Promise<ConsentQueueDto> {
    const [rows, waiting] = await Promise.all([
      this.prisma.parentalConsentRequest.findMany({
        where: query.status ? { status: query.status } : {},
        // Oldest waiting form first; otherwise the newest.
        orderBy: query.status === 'SUBMITTED' ? { submittedAt: 'asc' } : { createdAt: 'desc' },
        take: 200,
        include: {
          child: { select: { countryCode: true, studentProfile: true } },
          parent: { select: { displayName: true, email: true } },
          decidedBy: { select: { displayName: true } },
        },
      }),
      this.prisma.parentalConsentRequest.count({ where: { status: 'SUBMITTED' } }),
    ]);
    return {
      waiting,
      items: rows.map((row) => ({
        id: row.id,
        childId: row.childId,
        nickname: row.child.studentProfile?.nickname ?? '',
        birthYear: row.child.studentProfile?.birthYear ?? 0,
        parentId: row.parentId,
        parentName: row.parent.displayName,
        parentEmail: row.parent.email,
        countryCode: row.child.countryCode,
        method: row.method,
        status: row.status,
        createdAt: row.createdAt,
        submittedAt: row.submittedAt,
        decidedAt: row.decidedAt,
        decidedBy: row.decidedBy?.displayName ?? null,
        rejectReason: row.rejectReason,
        hasForm: row.formKey !== null,
      })),
    };
  }

  /** The uploaded form, to look at (downloaded; never shown on the admin page itself). */
  @Get(':id/form')
  @Can('read', 'ParentalConsent', { onAll: true })
  @ApiProduces('application/pdf', 'image/png', 'image/jpeg')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  async form(@Param('id', new ParseUUIDPipe()) id: string, @Res() res: Response): Promise<void> {
    const { body, contentType } = await this.consent.form(id);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'attachment; filename="consent-form"');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.send(body);
  }

  @Post(':id/decision')
  @Can('update', 'ParentalConsent', { onAll: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async decide(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ConsentDecisionDto,
    @CurrentUser() staff: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.consent.decide(id, dto.decision, dto.reason, staff, ctx);
  }
}
