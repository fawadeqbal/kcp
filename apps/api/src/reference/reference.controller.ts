import { Controller, Get, Header, NotFoundException, Param } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service.js';
import { Public } from '../permissions/permission.decorators.js';
import { CountryDto, LanguageDto, RegionDto } from './dto/reference.dto.js';

const CACHE = 'public, max-age=300';

/** Reference data the sign-up forms need. Public and cacheable. */
@ApiTags('reference')
@Controller()
@Public()
export class ReferenceController {
  constructor(private readonly prisma: PrismaService) {}

  /** Languages the platform is available in. */
  @Get('languages')
  @Header('Cache-Control', CACHE)
  @ApiOkResponse({ type: [LanguageDto] })
  async languages(): Promise<LanguageDto[]> {
    return this.prisma.language.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { code: true, name: true, nativeName: true, direction: true },
    });
  }

  /** Countries the platform is open in. */
  @Get('countries')
  @Header('Cache-Control', CACHE)
  @ApiOkResponse({ type: [CountryDto] })
  async countries(): Promise<CountryDto[]> {
    const countries = await this.prisma.country.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
      select: {
        code: true,
        names: true,
        currency: true,
        timezone: true,
        defaultLanguageCode: true,
      },
    });
    return countries.map((c) => ({ ...c, names: c.names as Record<string, string> }));
  }

  /** Regions and cities of an active country. */
  @Get('countries/:code/regions')
  @Header('Cache-Control', CACHE)
  @ApiOkResponse({ type: [RegionDto] })
  async regions(@Param('code') code: string): Promise<RegionDto[]> {
    const country = await this.prisma.country.findFirst({
      where: { code: code.toUpperCase(), isActive: true },
      select: {
        regions: {
          orderBy: { slug: 'asc' },
          select: {
            id: true,
            slug: true,
            names: true,
            cities: { orderBy: { slug: 'asc' }, select: { id: true, slug: true, names: true } },
          },
        },
      },
    });
    if (!country) {
      throw new NotFoundException('Country not available.');
    }
    return country.regions.map((r) => ({
      ...r,
      names: r.names as Record<string, string>,
      cities: r.cities.map((c) => ({ ...c, names: c.names as Record<string, string> })),
    }));
  }
}
