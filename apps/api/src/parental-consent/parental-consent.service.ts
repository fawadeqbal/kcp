import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common';
import type { ConsentMethod, Prisma, Under13ConsentMethod } from '@kcp/database';
import {
  CONSENT_FORM_MAX_BYTES,
  CONSENT_PENDING_DAYS,
  mayBeUnder13,
  TERMS_VERSION,
  TRIAL_DAYS,
} from '@kcp/shared';
import { AuditService } from '../audit/audit.service.js';
import { VerificationTokenService } from '../auth/verification-token.service.js';
import type { StripeCheckoutSession } from '../billing/stripe/stripe-api.js';
import { StripeWebhooksService } from '../billing/stripe/stripe-webhooks.service.js';
import { StripeGateway } from '../billing/stripe/stripe.gateway.js';
import { NO_REQUEST, type RequestContext } from '../common/request-context.js';
import { AppConfigService } from '../config/app-config.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { toMailLanguage } from '../mail/templates.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { StorageService } from '../storage/storage.service.js';
import { consentMethodsFor } from './under13-rules.js';
import type {
  ConfirmedConsentDto,
  ParentalConsentStatusDto,
  StartConsentResultDto,
  Under13MethodValue,
} from './parental-consent.dto.js';

/** How each method is written in the child's consent records. */
const RECORD_METHOD: Record<Under13ConsentMethod, ConsentMethod> = {
  CARD_CHECK: 'PAYMENT_CARD',
  SIGNED_FORM: 'SIGNED_FORM',
  EMAIL_PLUS: 'EMAIL_PLUS',
};

/** The email link lasts a week. */
const EMAIL_LINK_HOURS = 7 * 24;
const SETUP_PURPOSE = 'parental_consent';
const DAY = 24 * 60 * 60 * 1000;

/** Recognises an upload by its first bytes (never by what the browser says it is). */
export function formType(body: Buffer): { contentType: string; extension: string } | null {
  if (body.subarray(0, 5).toString('latin1') === '%PDF-') {
    return { contentType: 'application/pdf', extension: 'pdf' };
  }
  if (body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { contentType: 'image/png', extension: 'png' };
  }
  if (body.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return { contentType: 'image/jpeg', extension: 'jpg' };
  }
  return null;
}

type Tx = Prisma.TransactionClient;

/**
 * Verified parental consent for children under 13. A child under 13 is created
 * PENDING_CONSENT; the parent then confirms with one of the methods the child's
 * country accepts (Admin → Countries): a card check (Stripe, nothing charged), a
 * signed form that staff check, or "email plus" (a link by email, then a second email
 * a day later). Once verified the child's account opens and the consent is recorded.
 * A child still pending after CONSENT_PENDING_DAYS is deleted (ParentalConsentJobs).
 */
@Injectable()
export class ParentalConsentService implements OnModuleInit {
  private readonly logger = new Logger(ParentalConsentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
    private readonly config: AppConfigService,
    private readonly stripe: StripeGateway,
    private readonly webhooks: StripeWebhooksService,
    private readonly storage: StorageService,
    private readonly tokens: VerificationTokenService,
  ) {}

  onModuleInit() {
    this.webhooks.onSetupCompleted(SETUP_PURPOSE, (session) => this.cardChecked(session));
  }

  /** The methods a country accepts, in the order to offer them. */
  methodsFor(countryCode: string | null): Promise<Under13ConsentMethod[]> {
    return consentMethodsFor(this.prisma, countryCode);
  }

  // ── Parents ────────────────────────────────────────────────────────────────

  /** The child (the caller's own, checked by the controller) as this needs it. */
  private async child(childId: string) {
    const child = await this.prisma.user.findFirst({
      where: { id: childId, kind: 'STUDENT', status: { not: 'DELETED' } },
      include: { studentProfile: { select: { nickname: true, birthYear: true } } },
    });
    if (!child?.studentProfile) throw new NotFoundException('Child not found.');
    return child;
  }

  private latest(childId: string, tx: Tx = this.prisma) {
    return tx.parentalConsentRequest.findFirst({
      where: { childId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async status(childId: string): Promise<ParentalConsentStatusDto> {
    const child = await this.child(childId);
    const [request, methods] = await Promise.all([
      this.latest(childId),
      this.methodsFor(child.countryCode),
    ]);
    const pending = child.status === 'PENDING_CONSENT';
    return {
      status: request ? request.status : 'NOT_NEEDED',
      method: request?.method ?? null,
      methods,
      rejectReason: request?.status === 'REJECTED' ? request.rejectReason : null,
      submittedAt: request?.submittedAt ?? null,
      cardsAvailable: this.stripe.cardsAvailable,
      deleteAfter: pending
        ? new Date(child.createdAt.getTime() + CONSENT_PENDING_DAYS * DAY)
        : null,
    };
  }

  /**
   * The request to work on: the latest one while it's still open, otherwise a new one
   * (after a rejected form, the parent tries again).
   */
  private async openRequest(
    childId: string,
    parentId: string,
    method: Under13ConsentMethod,
    ctx: RequestContext,
  ) {
    const child = await this.child(childId);
    if (child.status !== 'PENDING_CONSENT') {
      throw new ConflictException({
        error: 'CONSENT_NOT_NEEDED',
        message: 'This account doesn’t need parental consent (any more).',
      });
    }
    const methods = await this.methodsFor(child.countryCode);
    if (!methods.includes(method)) {
      throw new BadRequestException({
        error: 'CONSENT_METHOD_UNAVAILABLE',
        message: 'This way of giving consent isn’t available in your country.',
      });
    }
    const latest = await this.latest(childId);
    const data = {
      method,
      ipAddress: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    };
    if (latest && latest.status === 'PENDING') {
      return {
        child,
        request: await this.prisma.parentalConsentRequest.update({
          where: { id: latest.id },
          data,
        }),
      };
    }
    if (latest?.status === 'SUBMITTED') {
      throw new ConflictException({
        error: 'CONSENT_UNDER_REVIEW',
        message: 'Your signed form is being checked. We’ll email you when it’s done.',
      });
    }
    return {
      child,
      request: await this.prisma.parentalConsentRequest.create({
        data: {
          ...data,
          parentId,
          childId,
          policyVersion: latest?.policyVersion ?? TERMS_VERSION,
        },
      }),
    };
  }

  async start(
    childId: string,
    method: Under13MethodValue,
    locale: string,
    parent: AuthUser,
    ctx: RequestContext,
  ): Promise<StartConsentResultDto> {
    const { child, request } = await this.openRequest(childId, parent.id, method, ctx);
    const web = this.config.get('WEB_APP_URL');
    const language = toMailLanguage(locale);
    await this.audit.record({
      actor: { id: parent.id, roleKey: parent.roleKey },
      action: 'child.consent_started',
      entityType: 'User',
      entityId: childId,
      after: { method },
      context: ctx,
    });
    if (method === 'CARD_CHECK') {
      const country = child.countryCode
        ? await this.prisma.country.findUnique({
            where: { code: child.countryCode },
            select: { currency: true },
          })
        : null;
      const back = `${web}/${language}/children/${childId}/consent`;
      const session = await this.stripe.client.checkout.sessions.create({
        mode: 'setup',
        currency: (country?.currency ?? 'USD').toLowerCase(),
        payment_method_types: ['card'],
        success_url: `${back}?card=done`,
        cancel_url: `${back}?card=canceled`,
        client_reference_id: parent.id,
        metadata: { purpose: SETUP_PURPOSE, requestId: request.id, parentId: parent.id },
        locale: 'auto',
      });
      await this.prisma.parentalConsentRequest.update({
        where: { id: request.id },
        data: { providerRef: session.id },
      });
      if (!session.url) throw new Error('Stripe returned no card check URL');
      return { url: session.url, emailSent: false };
    }
    if (method === 'EMAIL_PLUS') {
      const parentUser = await this.prisma.user.findUniqueOrThrow({ where: { id: parent.id } });
      if (!parentUser.email) throw new NotFoundException('Parent not found.');
      // The token belongs to the child: confirming it opens that child's account.
      const token = await this.tokens.issue(childId, 'PARENTAL_CONSENT', EMAIL_LINK_HOURS);
      await this.mail.send({
        to: parentUser.email,
        template: 'parentalConsent',
        language: toMailLanguage(parentUser.languageCode),
        params: {
          name: parentUser.displayName ?? '',
          actionUrl: `${web}/${toMailLanguage(parentUser.languageCode)}/consent/confirm?token=${encodeURIComponent(token)}`,
          vars: { nickname: child.studentProfile!.nickname },
        },
      });
      return { url: null, emailSent: true };
    }
    // SIGNED_FORM: the parent prints the form, signs it and uploads it next.
    return { url: null, emailSent: false };
  }

  /** A signed form, as uploaded (PDF, PNG or JPEG, up to 5 MB). */
  async uploadForm(
    childId: string,
    body: Buffer | undefined,
    parent: AuthUser,
    ctx: RequestContext,
  ): Promise<ParentalConsentStatusDto> {
    if (!Buffer.isBuffer(body) || body.length === 0) {
      throw new BadRequestException({
        error: 'CONSENT_FORM_MISSING',
        message: 'Choose a photo or scan of the signed form (PDF, PNG or JPEG).',
      });
    }
    if (body.length > CONSENT_FORM_MAX_BYTES) {
      throw new BadRequestException({
        error: 'CONSENT_FORM_TOO_BIG',
        message: 'The file is too big: up to 5 MB, please.',
      });
    }
    const type = formType(body);
    if (!type) {
      throw new BadRequestException({
        error: 'CONSENT_FORM_TYPE',
        message: 'Send the form as a PDF, PNG or JPEG file.',
      });
    }
    const { request } = await this.openRequest(childId, parent.id, 'SIGNED_FORM', ctx);
    const key = `consent-forms/${request.id}/form.${type.extension}`;
    await this.storage.putBinary(key, body, type.contentType);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.parentalConsentRequest.update({
        where: { id: request.id },
        data: {
          status: 'SUBMITTED',
          submittedAt: now,
          formKey: key,
          formContentType: type.contentType,
        },
      });
      await this.audit.record(
        {
          actor: { id: parent.id, roleKey: parent.roleKey },
          action: 'child.consent_form_uploaded',
          entityType: 'User',
          entityId: childId,
          after: { requestId: request.id, contentType: type.contentType, bytes: body.length },
          context: ctx,
        },
        tx,
      );
    });
    return this.status(childId);
  }

  // ── Verification ───────────────────────────────────────────────────────────

  /** The email link: no sign-in needed, the one-time token is the proof. */
  async confirmEmail(token: string, ctx: RequestContext): Promise<ConfirmedConsentDto> {
    const nickname = await this.prisma.$transaction(async (tx) => {
      const childId = await this.tokens.consume(token, 'PARENTAL_CONSENT', tx);
      const request = await this.latest(childId, tx);
      if (!request || request.status !== 'PENDING' || request.method !== 'EMAIL_PLUS') {
        throw new BadRequestException({
          error: 'INVALID_OR_EXPIRED_TOKEN',
          message: 'This link is invalid or has expired. Please request a new one.',
        });
      }
      await tx.parentalConsentRequest.update({
        where: { id: request.id },
        data: { emailConfirmedAt: new Date() },
      });
      return this.verify(request.id, null, ctx, tx);
    });
    return { nickname };
  }

  /** Stripe confirmed the card (the webhook): the consent is verified. */
  private async cardChecked(session: StripeCheckoutSession): Promise<{ parentId?: string }> {
    const request = await this.prisma.parentalConsentRequest.findUnique({
      where: { providerRef: session.id },
    });
    if (!request || request.status !== 'PENDING') return {};
    await this.prisma.$transaction((tx) => this.verify(request.id, null, NO_REQUEST, tx));
    await this.sendDone(request.id);
    return { parentId: request.parentId };
  }

  /** Staff checked a signed form. */
  async decide(
    requestId: string,
    decision: 'APPROVE' | 'REJECT',
    reason: string | undefined,
    staff: AuthUser,
    ctx: RequestContext,
  ): Promise<void> {
    const request = await this.prisma.parentalConsentRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException('Request not found.');
    if (request.status !== 'SUBMITTED') {
      throw new ConflictException({
        error: 'CONSENT_ALREADY_DECIDED',
        message: 'This form was checked already.',
      });
    }
    if (decision === 'REJECT' && !reason) {
      throw new BadRequestException({
        error: 'REASON_REQUIRED',
        message: 'Say why the form can’t be accepted: the parent reads it.',
      });
    }
    await this.prisma.$transaction(async (tx) => {
      if (decision === 'APPROVE') {
        await this.verify(requestId, staff, ctx, tx);
        return;
      }
      await tx.parentalConsentRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          decidedAt: new Date(),
          decidedById: staff.id,
          rejectReason: reason ?? null,
        },
      });
      await this.audit.record(
        {
          actor: { id: staff.id, roleKey: staff.roleKey },
          action: 'child.consent_rejected',
          entityType: 'User',
          entityId: request.childId,
          after: { requestId, reason },
          context: ctx,
        },
        tx,
      );
    });
    if (decision === 'APPROVE') await this.sendDone(requestId);
    else await this.sendRejected(requestId);
  }

  /**
   * Opens the child's account: the request is verified, the child becomes ACTIVE (the
   * free trial starts now), and the consent goes into the append-only records.
   */
  private async verify(
    requestId: string,
    staff: AuthUser | null,
    ctx: RequestContext,
    tx: Tx,
  ): Promise<string> {
    const request = await tx.parentalConsentRequest.update({
      where: { id: requestId },
      data: {
        status: 'VERIFIED',
        decidedAt: new Date(),
        decidedById: staff?.id ?? null,
      },
      include: { child: { include: { studentProfile: true } } },
    });
    const profile = request.child.studentProfile;
    if (!profile || !request.method) throw new NotFoundException('Child not found.');
    await tx.user.update({ where: { id: request.childId }, data: { status: 'ACTIVE' } });
    if (profile.trialEndsAt) {
      await tx.studentProfile.update({
        where: { userId: request.childId },
        data: { trialEndsAt: new Date(Date.now() + TRIAL_DAYS * DAY) },
      });
    }
    await tx.consentRecord.create({
      data: {
        parentId: request.parentId,
        childId: request.childId,
        type: 'ACCOUNT',
        policyVersion: request.policyVersion,
        method: RECORD_METHOD[request.method],
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
      },
    });
    await this.audit.record(
      {
        actor: staff
          ? { id: staff.id, roleKey: staff.roleKey }
          : { id: request.parentId, roleKey: 'parent' },
        action: 'child.consent_verified',
        entityType: 'User',
        entityId: request.childId,
        after: { requestId, method: request.method },
        context: ctx,
      },
      tx,
    );
    return profile.nickname;
  }

  private async parentOf(requestId: string) {
    return this.prisma.parentalConsentRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: {
        parent: { select: { email: true, displayName: true, languageCode: true } },
        child: { select: { studentProfile: { select: { nickname: true } } } },
      },
    });
  }

  private async sendDone(requestId: string) {
    await this.sendAbout(requestId, 'parentalConsentDone', 'dashboard', {});
  }

  private async sendRejected(requestId: string) {
    const request = await this.parentOf(requestId);
    await this.sendAbout(
      requestId,
      'parentalConsentRejected',
      `children/${request.childId}/consent`,
      {
        reason: request.rejectReason ?? '',
      },
    );
  }

  /** An email to the parent about the request (failures are logged, never thrown). */
  async sendAbout(
    requestId: string,
    template: 'parentalConsentDone' | 'parentalConsentRejected' | 'parentalConsentFollowUp',
    path: string,
    vars: Record<string, string>,
  ): Promise<void> {
    try {
      const request = await this.parentOf(requestId);
      if (!request.parent.email) return;
      const language = toMailLanguage(request.parent.languageCode);
      await this.mail.send({
        to: request.parent.email,
        template,
        language,
        params: {
          name: request.parent.displayName ?? '',
          actionUrl: `${this.config.get('WEB_APP_URL')}/${language}/${path}`,
          vars: { nickname: request.child.studentProfile?.nickname ?? '', ...vars },
        },
      });
    } catch (error) {
      this.logger.warn(`Consent email "${template}" not sent: ${(error as Error).message}`);
    }
  }

  // ── Admin ──────────────────────────────────────────────────────────────────

  async form(requestId: string): Promise<{ body: Buffer; contentType: string }> {
    const request = await this.prisma.parentalConsentRequest.findUnique({
      where: { id: requestId },
    });
    const body = request?.formKey ? await this.storage.getBinary(request.formKey) : null;
    if (!request?.formKey || !body) throw new NotFoundException('No form.');
    return { body, contentType: request.formContentType ?? 'application/octet-stream' };
  }

  /** Whether a child created now with this birth year needs verified consent first. */
  needsConsent(birthYear: number): boolean {
    return mayBeUnder13(birthYear, new Date().getUTCFullYear());
  }
}
