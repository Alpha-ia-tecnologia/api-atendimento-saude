import { Module } from '@nestjs/common';

import { MinioService } from './application/services/minio.service';

/**
 * Módulo compartilhado de arquivos. Exporta apenas o MinioService.
 *
 * Vive separado de `uploads/` (que tem o controller multipart) pra ser
 * importado por qualquer outro módulo (auth-maria, solicitacoes, etc.)
 * sem criar ciclo de dependência via AuthMariaModule.
 */
@Module({
  providers: [MinioService],
  exports: [MinioService],
})
export class FilesModule {}
