import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service.js';

/** S3-compatible file storage, available everywhere. */
@Global()
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
