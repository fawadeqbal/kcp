import { Global, Module } from '@nestjs/common';
import { AbilityFactory } from './ability.factory.js';
import { PoliciesGuard } from './policies.guard.js';

@Global()
@Module({
  providers: [AbilityFactory, PoliciesGuard],
  exports: [AbilityFactory, PoliciesGuard],
})
export class PermissionsModule {}
