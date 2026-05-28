import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { JwtAccessPayload, JwtRefreshPayload } from '../../../../shared/types/authenticated-user';
import { REFRESH_TOKEN_REPOSITORY } from '../../../../shared/constants/injection-tokens';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

function parseDurationToMs(value: string, fallbackMs: number): number {
  if (!value) return fallbackMs;
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) return fallbackMs;
  const n = Number(match[1]);
  switch (match[2]) {
    case 's': return n * MS_PER_SECOND;
    case 'm': return n * MS_PER_MINUTE;
    case 'h': return n * MS_PER_HOUR;
    case 'd': return n * MS_PER_DAY;
    default: return fallbackMs;
  }
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  generateSessionId(): string {
    return uuidv4();
  }

  async signAccessToken(payload: Omit<JwtAccessPayload, 'iat' | 'exp' | 'type'>): Promise<string> {
    return this.jwtService.signAsync(
      { ...payload, type: 'access' },
      {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
      },
    );
  }

  async signRefreshToken(payload: Omit<JwtRefreshPayload, 'iat' | 'exp' | 'type'>): Promise<string> {
    return this.jwtService.signAsync(
      { ...payload, type: 'refresh' },
      {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );
  }

  async verifyRefreshToken(token: string): Promise<JwtRefreshPayload> {
    const payload = await this.jwtService.verifyAsync<JwtRefreshPayload>(token, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
    });
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }
    return payload;
  }

  async persistRefreshToken(userId: string, sessionId: string, token: string): Promise<void> {
    const tokenHash = await bcrypt.hash(token, 10);
    const ttlMs = parseDurationToMs(
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      7 * MS_PER_DAY,
    );
    const expiresAt = new Date(Date.now() + ttlMs);
    await this.refreshTokenRepository.create({ userId, sessionId, tokenHash, expiresAt });
  }

  async matchesPersistedToken(token: string, persistedHash: string): Promise<boolean> {
    return bcrypt.compare(token, persistedHash);
  }
}
