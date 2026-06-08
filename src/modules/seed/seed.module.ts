import { Module } from '@nestjs/common';

import { SeedService } from './seed.service';

/**
 * Roda o seed essencial automaticamente no boot quando o banco está vazio.
 * PrismaService e ConfigService já são globais (SharedModule/ConfigModule).
 */
@Module({
  providers: [SeedService],
})
export class SeedModule {}
