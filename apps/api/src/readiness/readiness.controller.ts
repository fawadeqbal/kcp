import { Body, Controller, Get, HttpCode, HttpStatus, Post, Put } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../permissions/auth-user.js';
import { Can, CurrentUser } from '../permissions/permission.decorators.js';
import {
  ReadinessCheckDto,
  ReadinessDto,
  ReadinessSavedDto,
  SaveReadinessDto,
} from './readiness.dto.js';
import { ReadinessService } from './readiness.service.js';

/** The hub readiness check, for the student taking it. */
@ApiTags('readiness')
@Controller('readiness')
export class ReadinessController {
  constructor(private readonly readiness: ReadinessService) {}

  @Get()
  @Can('create', 'ReadinessCheck')
  @ApiOkResponse({ type: ReadinessDto })
  overview(@CurrentUser() user: AuthUser): Promise<ReadinessDto> {
    return this.readiness.overview(user);
  }

  /** Starts the timer. */
  @Post('start')
  @Can('create', 'ReadinessCheck')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ReadinessCheckDto })
  start(@CurrentUser() user: AuthUser): Promise<ReadinessCheckDto> {
    return this.readiness.start(user);
  }

  /** Saves the work so far (the page saves as the student types). */
  @Put('current')
  @Can('update', 'ReadinessCheck')
  @ApiOkResponse({ type: ReadinessSavedDto })
  save(@Body() dto: SaveReadinessDto, @CurrentUser() user: AuthUser): Promise<ReadinessSavedDto> {
    return this.readiness.save(user, dto.files);
  }

  /** Hands the work in for a mentor to grade. */
  @Post('current/submit')
  @Can('update', 'ReadinessCheck')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ReadinessCheckDto })
  submit(@Body() dto: SaveReadinessDto, @CurrentUser() user: AuthUser): Promise<ReadinessCheckDto> {
    return this.readiness.submit(user, dto.files);
  }
}
