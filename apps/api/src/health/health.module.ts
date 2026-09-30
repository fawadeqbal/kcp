import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller.js';
import {
  DatabaseHealthIndicator,
  RedisHealthIndicator,
  StorageHealthIndicator,
} from './health.indicators.js';

@Module({
  imports: [TerminusModule.forRoot({ errorLogStyle: 'pretty' })],
  controllers: [HealthController],
  providers: [DatabaseHealthIndicator, RedisHealthIndicator, StorageHealthIndicator],
})
export class HealthModule {}
