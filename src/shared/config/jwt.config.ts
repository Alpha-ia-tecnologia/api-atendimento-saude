import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

export const jwtConfigFactory = (config: ConfigService): JwtModuleOptions => ({
  secret: config.getOrThrow<string>('JWT_SECRET'),
  signOptions: {
    expiresIn: config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
  },
});
