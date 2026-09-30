import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { HealthIndicatorService, TerminusModule } from '@nestjs/terminus';
import { AppConfigService } from '../config/app-config.service.js';
import { HealthController } from './health.controller.js';
import {
  DatabaseHealthIndicator,
  RedisHealthIndicator,
  StorageHealthIndicator,
} from './health.indicators.js';

async function setup(databaseUp: boolean, storageUp = true) {
  const moduleRef = await Test.createTestingModule({
    imports: [TerminusModule],
    controllers: [HealthController],
    providers: [
      { provide: AppConfigService, useValue: { get: () => 'test-version' } },
      {
        provide: DatabaseHealthIndicator,
        inject: [HealthIndicatorService],
        useFactory: (health: HealthIndicatorService) => ({
          check: async () =>
            databaseUp
              ? health.check('database').up()
              : health.check('database').down({ message: 'connection refused' }),
        }),
      },
      {
        provide: RedisHealthIndicator,
        inject: [HealthIndicatorService],
        useFactory: (health: HealthIndicatorService) => ({
          check: async () => health.check('redis').up(),
        }),
      },
      {
        provide: StorageHealthIndicator,
        inject: [HealthIndicatorService],
        useFactory: (health: HealthIndicatorService) => ({
          check: async () =>
            storageUp
              ? health.check('storage').up()
              : health.check('storage').down({ message: 'NotFound' }),
        }),
      },
    ],
  }).compile();
  return moduleRef.get(HealthController);
}

describe('HealthController', () => {
  it('reports liveness with the build version', async () => {
    const controller = await setup(true);
    expect(controller.live()).toMatchObject({ status: 'ok', version: 'test-version' });
  });

  it('is ready when PostgreSQL and Redis are up', async () => {
    const controller = await setup(true);
    await expect(controller.ready()).resolves.toMatchObject({ status: 'ok' });
  });

  it('stays ready when file storage is down, and reports storage on its own', async () => {
    const controller = await setup(true, false);
    await expect(controller.ready()).resolves.toMatchObject({ status: 'ok' });
    await expect(controller.storageCheck()).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect((await setup(true)).storageCheck()).resolves.toMatchObject({ status: 'ok' });
  });

  it('is not ready when a dependency is down', async () => {
    const controller = await setup(false);
    await expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
