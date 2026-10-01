import { Module } from '@nestjs/common';
import { ContentStudioController } from './content-studio.controller.js';
import { ContentStudioService } from './content-studio.service.js';

@Module({ controllers: [ContentStudioController], providers: [ContentStudioService] })
export class ContentStudioModule {}
