import { TRIAL_DAYS } from '@kcp/shared';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { PublicPricingDto } from './dto/billing.dto.js';

/** Prices for the marketing site: active countries with both plans priced. */
@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  async publicPricing(): Promise<PublicPricingDto> {
    const countries = await this.prisma.country.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
      include: { prices: { where: { plan: { isActive: true } } } },
    });
    const priced = countries.flatMap((country) => {
      const monthly = country.prices.find((p) => p.planKey === 'monthly');
      const yearly = country.prices.find((p) => p.planKey === 'yearly');
      if (!monthly || !yearly) return [];
      return [
        {
          code: country.code,
          currency: country.currency,
          names: country.names as Record<string, string>,
          monthlyMinor: monthly.amountMinor,
          yearlyMinor: yearly.amountMinor,
          familyDiscountPercent: country.familyDiscountPercent,
        },
      ];
    });
    return {
      trialDays: TRIAL_DAYS,
      familyDiscountPercent: priced.length
        ? Math.min(...priced.map((c) => c.familyDiscountPercent))
        : 0,
      countries: priced,
    };
  }
}
