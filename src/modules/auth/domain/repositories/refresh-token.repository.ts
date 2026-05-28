import { RefreshTokenEntity } from '../entities/refresh-token.entity';

export interface CreateRefreshTokenData {
  userId: string;
  tokenHash: string;
  sessionId: string;
  expiresAt: Date;
}

export interface RefreshTokenRepository {
  create(data: CreateRefreshTokenData): Promise<RefreshTokenEntity>;
  findActiveByUserId(userId: string): Promise<RefreshTokenEntity[]>;
  findActiveBySessionId(sessionId: string): Promise<RefreshTokenEntity | null>;
  revokeBySessionId(sessionId: string): Promise<void>;
  revokeAllByUserId(userId: string): Promise<void>;
}
