import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiProduces, ApiTags } from '@nestjs/swagger';
import { byIp, RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import { ReqContext, type RequestContext } from '../common/request-context.js';
import { PrismaService } from '../database/prisma.service.js';
import { LanguageQueryDto } from '../learning/dto/learning.dto.js';
import type { AppAbility } from '../permissions/ability.factory.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { Can, CurrentAbility, CurrentUser, Public } from '../permissions/permission.decorators.js';
import { RemoveBadgeBody } from '../progress/dto/progress.dto.js';
import {
  CertificateCodeParam,
  CertificateDto,
  CertificateListDto,
  ChildCertificatesDto,
  IssueCertificateDto,
  VerifiedCertificateDto,
} from './certificates.dto.js';
import { CertificatesService } from './certificates.service.js';

const MINUTE = 60;

@ApiTags('certificates')
@Controller()
export class CertificatesController {
  constructor(
    private readonly certificates: CertificatesService,
    private readonly prisma: PrismaService,
  ) {}

  /** The student's modules: finished or not, with their certificates. */
  @Get('certificates')
  @Can('read', 'Certificate')
  @ApiOkResponse({ type: CertificateListDto })
  list(
    @Query() query: LanguageQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CertificateListDto> {
    return this.certificates.list(user, query.lang ?? 'en');
  }

  /** Gets the certificate for a finished module (premium). */
  @Post('certificates')
  @Can('create', 'Certificate')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: CertificateDto })
  issue(
    @Body() dto: IssueCertificateDto,
    @Query() query: LanguageQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CertificateDto> {
    return this.certificates.issue(user, dto.moduleId, query.lang ?? 'en');
  }

  /** The certificate as a PDF (the student, their parents, or staff). */
  @Get('certificates/:id/pdf')
  @Can('read', 'Certificate')
  @ApiProduces('application/pdf')
  @ApiOkResponse({ description: 'The PDF' })
  async pdf(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
    @CurrentAbility() ability: AppAbility,
  ): Promise<StreamableFile> {
    const { code, pdf } = await this.certificates.pdf(id, user, ability);
    return new StreamableFile(Buffer.from(pdf), {
      type: 'application/pdf',
      disposition: `attachment; filename="kcp-certificate-${code}.pdf"`,
    });
  }

  /** A child's certificates, for their parent. */
  @Get('children/:id/certificates')
  @Can('read', 'Child')
  @ApiOkResponse({ type: ChildCertificatesDto })
  async forChild(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: LanguageQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ChildCertificatesDto> {
    const link = await this.prisma.parentChildLink.findUnique({
      where: { parentId_childId: { parentId: user.id, childId: id } },
    });
    if (!link) throw new NotFoundException('Child not found.');
    return { certificates: await this.certificates.forChild(id, query.lang ?? 'en') };
  }

  /** Staff: a student's certificates, revoked ones too. */
  @Get('admin/users/:id/certificates')
  @Can('read', 'Certificate', { onAll: true })
  @ApiOkResponse({ type: ChildCertificatesDto })
  async forStaff(@Param('id', new ParseUUIDPipe()) id: string): Promise<ChildCertificatesDto> {
    return { certificates: await this.certificates.forChild(id, 'en') };
  }

  /** Checks a certificate by the code printed on it. */
  @Get('public/certificates/:code')
  @Public()
  @RateLimit({ name: 'certificate-verify-ip', limit: 60, windowSeconds: MINUTE, key: byIp })
  @ApiOkResponse({ type: VerifiedCertificateDto })
  verify(@Param() params: CertificateCodeParam): Promise<VerifiedCertificateDto> {
    return this.certificates.verify(params.code);
  }

  /** Staff revoke a certificate, with a reason (verification then says so). */
  @Post('admin/certificates/:id/revoke')
  @Can('update', 'Certificate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async revoke(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RemoveBadgeBody,
    @CurrentUser() staff: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.certificates.revoke(id, dto.reason.trim(), staff, ctx);
  }
}
