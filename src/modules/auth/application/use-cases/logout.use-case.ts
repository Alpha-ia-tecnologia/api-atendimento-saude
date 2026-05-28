import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { REFRESH_TOKEN_REPOSITORY } from '../../../../shared/constants/injection-tokens';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import { AUDIT_EVENT } from '../../../audit/application/events/audit.event';

export interface LogoutContext {
  userId: string;
  sessionId: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(ctx: LogoutContext): Promise<void> {
    await this.refreshTokenRepository.revokeBySessionId(ctx.sessionId);
    this.eventEmitter.emit(AUDIT_EVENT, {
      userId: ctx.userId,
      action: 'LOGOUT',
      resource: 'AUTH',
      resourceId: ctx.sessionId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  }
}
