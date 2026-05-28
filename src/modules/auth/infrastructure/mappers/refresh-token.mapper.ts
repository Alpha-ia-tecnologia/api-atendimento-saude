import { RefreshToken as PrismaRefreshToken } from '@prisma/client';
import { RefreshTokenEntity } from '../../domain/entities/refresh-token.entity';

export class RefreshTokenMapper {
  static toDomain(record: PrismaRefreshToken): RefreshTokenEntity {
    return new RefreshTokenEntity(
      record.id,
      record.userId,
      record.tokenHash,
      record.sessionId,
      record.expiresAt,
      record.revokedAt,
      record.createdAt,
      record.updatedAt,
    );
  }
}
