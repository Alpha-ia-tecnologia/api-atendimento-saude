import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from './database/prisma/prisma.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { jwtConfigFactory } from './config/jwt.config';

@Global()
@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: jwtConfigFactory,
    }),
  ],
  providers: [JwtAuthGuard, PermissionsGuard],
  exports: [PrismaModule, JwtModule, JwtAuthGuard, PermissionsGuard],
})
export class SharedModule {}
