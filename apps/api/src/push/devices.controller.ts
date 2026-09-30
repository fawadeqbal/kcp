import { Body, Controller, HttpCode, HttpStatus, Post, Put } from '@nestjs/common';
import { ApiNoContentResponse, ApiTags } from '@nestjs/swagger';
import { byIp, RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { Authenticated, CurrentUser, Public } from '../permissions/permission.decorators.js';
import { DevicesService } from './devices.service.js';
import { RegisterDeviceDto, RemoveDeviceDto } from './dto/devices.dto.js';

const HOUR = 60 * 60;

/** The mobile app's phones, for push notifications (students and parents only). */
@ApiTags('devices')
@Controller('devices')
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  /** Registers this phone, or refreshes it (the app calls it on every start). */
  @Put()
  @Authenticated()
  @HttpCode(HttpStatus.NO_CONTENT)
  // Generous: a school's phones may share one address.
  @RateLimit({ name: 'device-register-ip', limit: 300, windowSeconds: HOUR, key: byIp })
  @ApiNoContentResponse()
  async register(@Body() dto: RegisterDeviceDto, @CurrentUser() user: AuthUser): Promise<void> {
    await this.devices.register(user, dto);
  }

  /** Stops notifications to this phone (on logout; works without a session). */
  @Post('remove')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @RateLimit({ name: 'device-remove-ip', limit: 300, windowSeconds: HOUR, key: byIp })
  @ApiNoContentResponse()
  async remove(@Body() dto: RemoveDeviceDto): Promise<void> {
    await this.devices.remove(dto.token);
  }
}
