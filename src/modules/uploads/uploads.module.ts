import { Module } from '@nestjs/common';

import { AuthMariaModule } from '../auth-maria/auth-maria.module';
import { FilesModule } from '../files/files.module';
import { UploadsController } from './presentation/controllers/uploads.controller';

@Module({
  imports: [AuthMariaModule, FilesModule],
  controllers: [UploadsController],
})
export class UploadsModule {}
