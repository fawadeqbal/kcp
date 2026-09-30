import { subject } from '@casl/ability';
import { LAUNCH_LANGUAGES } from '@kcp/database';
import { PLAN_KEYS } from '@kcp/shared';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import type { RequestContext } from '../common/request-context.js';
import { PrismaService } from '../database/prisma.service.js';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service.js';
import type { AppAbility } from '../permissions/ability.factory.js';
import type { AuthUser } from '../permissions/auth-user.js';
import type {
  CountryAdminDto,
  FeatureFlagListDto,
  LanguageListDto,
  UpdateCountryDto,
  UpdateFeatureFlagDto,
} from './settings-admin.dto.js';

/** The language everything falls back to: it can't be switched off. */
const FALLBACK_LANGUAGE = 'en';
const LIVE_SUBSCRIPTIONS = ['ACTIVE', 'PAST_DUE'] as const;
const count = (rows: { languageCode: string; _count: { _all: number } }[], code: string) =>
  rows.find((row) => row.languageCode === code)?._count._all ?? 0;

/**
 * Admin → Countries and languages, and Feature flags. Every change is checked
 * against what would break for families, and written to the audit log.
 */
@Injectable()
export class SettingsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly flags: FeatureFlagsService,
  ) {}

  // ── Countries ──────────────────────────────────────────────────────────────

  async updateCountry(
    code: string,
    dto: UpdateCountryDto,
    staff: AuthUser,
    ability: AppAbility,
    ctx: RequestContext,
  ): Promise<CountryAdminDto> {
    const fields = (['isActive', 'currency'] as const).filter((field) => dto[field] !== undefined);
    if (fields.length === 0) {
      throw new BadRequestException({ error: 'NOTHING_TO_CHANGE', message: 'Nothing to change.' });
    }
    for (const field of fields) {
      if (!ability.can('update', subject('Country', { code }), field)) {
        throw new ForbiddenException({
          error: 'FORBIDDEN',
          message: `You can't change a country's ${field}.`,
        });
      }
    }
    const country = await this.prisma.country.findUnique({
      where: { code },
      include: { prices: true, defaultLanguage: true },
    });
    if (!country) throw new NotFoundException('Country not found.');
    const currency = dto.currency ?? country.currency;
    const isActive = dto.isActive ?? country.isActive;
    const currencyChanges = currency !== country.currency;

    if (currencyChanges) {
      if (isActive) {
        throw new ConflictException({
          error: 'COUNTRY_ACTIVE',
          message: 'Switch the country off before changing its currency, then set its prices.',
        });
      }
      if (!Intl.supportedValuesOf('currency').includes(currency)) {
        throw new BadRequestException({
          error: 'UNKNOWN_CURRENCY',
          message: `${currency} is not a currency code we know.`,
        });
      }
      const plans = await this.prisma.subscription.count({
        where: { status: { in: [...LIVE_SUBSCRIPTIONS] }, parent: { countryCode: code } },
      });
      if (plans > 0) {
        throw new ConflictException({
          error: 'COUNTRY_HAS_PLANS',
          message: `${plans} families in this country have a plan in ${country.currency}. The currency can't change while they do.`,
        });
      }
    }
    if (isActive && !country.isActive) {
      const priced = new Set(
        country.prices.filter((p) => p.currency === currency).map((p) => p.planKey),
      );
      if (currencyChanges || PLAN_KEYS.some((key) => !priced.has(key))) {
        throw new ConflictException({
          error: 'PRICES_MISSING',
          message: 'Set the monthly and yearly prices before switching the country on.',
        });
      }
      if (!country.defaultLanguage.isActive) {
        throw new ConflictException({
          error: 'LANGUAGE_OFF',
          message: `Switch ${country.defaultLanguage.name} on first: it's this country's main language.`,
        });
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (currencyChanges) {
        // Prices were in the old currency: they're set again in the new one.
        await tx.planPrice.deleteMany({ where: { countryCode: code } });
      }
      const row = await tx.country.update({ where: { code }, data: { isActive, currency } });
      await this.audit.record(
        {
          actor: { id: staff.id, roleKey: staff.roleKey },
          action: 'country.update',
          entityType: 'Country',
          entityId: code,
          before: { isActive: country.isActive, currency: country.currency },
          after: { isActive, currency },
          context: ctx,
        },
        tx,
      );
      return row;
    });
    return { code: updated.code, isActive: updated.isActive, currency: updated.currency };
  }

  // ── Languages ──────────────────────────────────────────────────────────────

  async languages(): Promise<LanguageListDto> {
    const [languages, accounts, lessons] = await Promise.all([
      this.prisma.language.findMany({ orderBy: { sortOrder: 'asc' } }),
      this.prisma.user.groupBy({
        by: ['languageCode'],
        where: { status: { not: 'DELETED' } },
        _count: { _all: true },
      }),
      this.prisma.lessonTranslation.groupBy({
        by: ['languageCode'],
        where: { lesson: { isActive: true } },
        _count: { _all: true },
      }),
    ]);
    return {
      languages: languages.map((language) => ({
        code: language.code,
        name: language.name,
        nativeName: language.nativeName,
        direction: language.direction,
        isActive: language.isActive,
        accounts: count(accounts, language.code),
        lessons: count(lessons, language.code),
      })),
    };
  }

  async updateLanguage(
    code: string,
    isActive: boolean,
    staff: AuthUser,
    ability: AppAbility,
    ctx: RequestContext,
  ): Promise<void> {
    if (!ability.can('update', subject('Language', { code }), 'isActive')) {
      throw new ForbiddenException({
        error: 'FORBIDDEN',
        message: "You can't switch languages on or off.",
      });
    }
    const language = await this.prisma.language.findUnique({ where: { code } });
    if (!language) throw new NotFoundException('Language not found.');
    if (language.isActive === isActive) return;
    if (isActive && !(LAUNCH_LANGUAGES as readonly string[]).includes(code)) {
      throw new ConflictException({
        error: 'NOT_TRANSLATED',
        message: `The apps aren't translated into ${language.name} yet.`,
      });
    }
    if (!isActive) {
      if (code === FALLBACK_LANGUAGE) {
        throw new ConflictException({
          error: 'FALLBACK_LANGUAGE',
          message: 'English stays on: every text falls back to it.',
        });
      }
      const countries = await this.prisma.country.findMany({
        where: { isActive: true, defaultLanguageCode: code },
        select: { code: true },
      });
      if (countries.length) {
        throw new ConflictException({
          error: 'LANGUAGE_IN_USE',
          message: `It's the main language of ${countries.map((c) => c.code).join(', ')}. Switch those countries off first.`,
        });
      }
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.language.update({ where: { code }, data: { isActive } });
      await this.audit.record(
        {
          actor: { id: staff.id, roleKey: staff.roleKey },
          action: 'language.update',
          entityType: 'Language',
          entityId: code,
          before: { isActive: language.isActive },
          after: { isActive },
          context: ctx,
        },
        tx,
      );
    });
  }

  // ── Feature flags ──────────────────────────────────────────────────────────

  async featureFlags(): Promise<FeatureFlagListDto> {
    const flags = await this.prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
    const editors = await this.prisma.user.findMany({
      where: { id: { in: flags.map((f) => f.updatedById).filter((id): id is string => !!id) } },
      select: { id: true, displayName: true, email: true },
    });
    return {
      flags: flags.map((flag) => {
        const editor = editors.find((e) => e.id === flag.updatedById);
        return {
          key: flag.key,
          description: flag.description,
          enabled: flag.enabled,
          countryCodes: flag.countryCodes,
          updatedAt: flag.updatedAt,
          updatedBy: editor ? (editor.displayName ?? editor.email) : null,
        };
      }),
    };
  }

  async updateFeatureFlag(
    key: string,
    dto: UpdateFeatureFlagDto,
    staff: AuthUser,
    ctx: RequestContext,
  ): Promise<void> {
    const flag = await this.prisma.featureFlag.findUnique({ where: { key } });
    if (!flag) throw new NotFoundException('No feature flag has this key.');
    const countryCodes = dto.countryCodes ? [...new Set(dto.countryCodes)].toSorted() : undefined;
    if (countryCodes?.length) {
      const known = await this.prisma.country.count({ where: { code: { in: countryCodes } } });
      if (known !== countryCodes.length) {
        throw new BadRequestException({
          error: 'UNKNOWN_COUNTRY',
          message: 'One of the countries is not in the list.',
        });
      }
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.featureFlag.update({
        where: { key },
        data: {
          ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
          ...(countryCodes ? { countryCodes } : {}),
          updatedById: staff.id,
        },
      });
      await this.audit.record(
        {
          actor: { id: staff.id, roleKey: staff.roleKey },
          action: 'feature_flag.update',
          entityType: 'FeatureFlag',
          entityId: key,
          before: { enabled: flag.enabled, countryCodes: flag.countryCodes },
          after: {
            enabled: dto.enabled ?? flag.enabled,
            countryCodes: countryCodes ?? flag.countryCodes,
            reason: dto.reason.trim(),
          },
          context: ctx,
        },
        tx,
      );
    });
    // This server sees it at once; others within the cache time (30 seconds).
    this.flags.invalidate();
  }
}
