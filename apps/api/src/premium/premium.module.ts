import { Module } from '@nestjs/common';
import { PremiumController } from './premium.controller.js';
import { PremiumService } from './premium.service.js';

@Module({
  controllers: [PremiumController],
  providers: [PremiumService],
  exports: [PremiumService],
})
export class PremiumModule {}
