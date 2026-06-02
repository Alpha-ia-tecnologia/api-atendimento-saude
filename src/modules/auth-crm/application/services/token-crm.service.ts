import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TipoPerfilCrm } from '@prisma/client';

export interface CrmAccessPayload {
  sub: string;
  email: string;
  perfil: TipoPerfilCrm;
  sessionId: string;
  audience: 'crm';
  type: 'access';
  iat?: number;
  exp?: number;
}

export interface CrmRefreshPayload {
  sub: string;
  sessionId: string;
  audience: 'crm';
  type: 'refresh';
  iat?: number;
  exp?: number;
}

/** Operador autenticado, injetado nas rotas do CRM. */
export interface AuthenticatedCrm {
  usuarioCrmId: string;
  email: string;
  perfil: TipoPerfilCrm;
  sessionId: string;
}

@Injectable()
export class TokenCrmService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  signAccessToken(payload: {
    sub: string;
    email: string;
    perfil: TipoPerfilCrm;
    sessionId: string;
  }): Promise<string> {
    return this.jwtService.signAsync(
      { ...payload, audience: 'crm', type: 'access' },
      {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
      },
    );
  }

  signRefreshToken(payload: { sub: string; sessionId: string }): Promise<string> {
    return this.jwtService.signAsync(
      // jti único garante token distinto a cada rotação (mesmo no mesmo segundo).
      { ...payload, jti: randomUUID(), audience: 'crm', type: 'refresh' },
      {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );
  }

  async verifyAccessToken(token: string): Promise<CrmAccessPayload> {
    let payload: CrmAccessPayload;
    try {
      payload = await this.jwtService.verifyAsync<CrmAccessPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado.');
    }
    if (payload.audience !== 'crm' || payload.type !== 'access') {
      throw new UnauthorizedException('Token não pertence ao CRM.');
    }
    return payload;
  }

  async verifyRefreshToken(token: string): Promise<CrmRefreshPayload> {
    let payload: CrmRefreshPayload;
    try {
      payload = await this.jwtService.verifyAsync<CrmRefreshPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Sessão expirada. Faça login novamente.');
    }
    if (payload.audience !== 'crm' || payload.type !== 'refresh') {
      throw new UnauthorizedException('Token de refresh inválido.');
    }
    return payload;
  }

  /**
   * Hash do refresh token para armazenar/comparar. Usa SHA-256 (cobre o token
   * INTEIRO) — bcrypt não serve aqui porque trunca em 72 bytes, e dois JWTs da
   * mesma sessão compartilham o mesmo prefixo. O refresh já é alta-entropia,
   * então não precisa do custo do bcrypt.
   */
  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Comparação em tempo constante do refresh contra o hash persistido. */
  compareRefreshToken(token: string, hashHex: string): boolean {
    const a = Buffer.from(this.hashRefreshToken(token), 'hex');
    const b = Buffer.from(hashHex, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  }

  /** Expiração do refresh em ms (para calcular `expiraEm` do RefreshToken). */
  refreshTtlMs(): number {
    const raw = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    return parseDuracao(raw);
  }
}

/** Converte '7d' | '15m' | '3600s' | '3600' em milissegundos. */
function parseDuracao(valor: string): number {
  const m = /^(\d+)\s*([smhd])?$/.exec(valor.trim());
  if (!m) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(m[1]);
  switch (m[2]) {
    case 's':
      return n * 1000;
    case 'm':
      return n * 60 * 1000;
    case 'h':
      return n * 60 * 60 * 1000;
    case 'd':
      return n * 24 * 60 * 60 * 1000;
    default:
      return n * 1000; // sem sufixo = segundos
  }
}
