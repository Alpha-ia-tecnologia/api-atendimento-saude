import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import {
  CreateRefreshTokenData,
  RefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository';
import { RefreshTokenEntity } from '../../domain/entities/refresh-token.entity';
import { RefreshTokenMapper } from '../mappers/refresh-token.mapper';

@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateRefreshTokenData): Promise<RefreshTokenEntity> {
    const record = await this.prisma.refreshToken.create({ data });
    return RefreshTokenMapper.toDomain(record);
  }

  async findActiveByUserId(userId: string): Promise<RefreshTokenEntity[]> {
    const now = new Date();
    const records = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: now } },
    });
    return records.map(RefreshTokenMapper.toDomain);
  }

  async findActiveBySessionId(sessionId: string): Promise<RefreshTokenEntity | null> {
    const now = new Date();
    const record = await this.prisma.refreshToken.findFirst({
      where: { sessionId, revokedAt: null, expiresAt: { gt: now } },
    });
    return record ? RefreshTokenMapper.toDomain(record) : null;
  }

  async revokeBySessionId(sessionId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
