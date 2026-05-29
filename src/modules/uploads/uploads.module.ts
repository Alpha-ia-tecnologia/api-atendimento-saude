import { Module } from '@nestjs/common';

import { AuthMariaModule } from '../auth-maria/auth-maria.module';
import { MinioService } from './application/services/minio.service';
import { UploadsController } from './presentation/controllers/uploads.controller';

@Module({
  imports: [AuthMariaModule],
  controllers: [UploadsController],
  providers: [MinioService],
  exports: [MinioService],
})
export class UploadsModule {}
