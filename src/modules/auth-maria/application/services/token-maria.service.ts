import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

export interface MariaJwtPayload {
  sub: string;
  cpf: string;
  audience: 'maria';
  type: 'access';
  iat?: number;
  exp?: number;
}

export interface AuthenticatedMaria {
  usuarioMariaId: string;
  cpf: string;
}

@Injectable()
export class TokenMariaService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  signAccessToken(payload: { sub: string; cpf: string }): Promise<string> {
    return this.jwtService.signAsync(
      { ...payload, audience: 'maria', type: 'access' },
      {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
        // Sessão longa pra paciente — login é dor pra quem é idoso.
        expiresIn: this.configService.get<string>('JWT_MARIA_EXPIRES_IN', '30d'),
      },
    );
  }

  async verifyAccessToken(token: string): Promise<MariaJwtPayload> {
    let payload: MariaJwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<MariaJwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado.');
    }
    if (payload.audience !== 'maria' || payload.type !== 'access') {
      throw new UnauthorizedException('Token não pertence ao app do paciente.');
    }
    return payload;
  }
}
