import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserStatus } from '@prisma/client';
import { TokenService } from '../services/token.service';
import { LoginDto } from '../dtos/login.dto';
import { AuthResponseDto } from '../dtos/auth-response.dto';
import { USER_REPOSITORY, REFRESH_TOKEN_REPOSITORY } from '../../../../shared/constants/injection-tokens';
import { UserRepository } from '../../../users/domain/repositories/user.repository';
import { AUDIT_EVENT } from '../../../audit/application/events/audit.event';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import { InvalidCredentialsException } from '../../../../shared/exceptions/domain.exception';
import { comparePassword } from '../../../../shared/utils/bcrypt.util';

export interface LoginContext {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: LoginDto, ctx: LoginContext = {}): Promise<AuthResponseDto> {
    const user = await this.userRepository.findByEmailWithRolesAndPermissions(dto.email);
    if (!user) throw new InvalidCredentialsException();

    const matches = await comparePassword(dto.password, user.passwordHash);
    if (!matches) throw new InvalidCredentialsException();

    if (user.status !== UserStatus.ACTIVE || !user.isActive()) {
      throw new InvalidCredentialsException();
    }

    const singleSession = this.configService.get<string>('AUTH_SINGLE_SESSION', 'true') === 'true';
    if (singleSession) {
      await this.refreshTokenRepository.revokeAllByUserId(user.id);
    }

    const sessionId = this.tokenService.generateSessionId();
    const roles = user.roleNames();
    const permissions = user.allPermissions();

    const accessToken = await this.tokenService.signAccessToken({
      sub: user.id,
      email: user.email,
      sessionId,
      roles,
      permissions,
    });
    const refreshToken = await this.tokenService.signRefreshToken({
      sub: user.id,
      sessionId,
    });

    await this.tokenService.persistRefreshToken(user.id, sessionId, refreshToken);
    await this.userRepository.updateLastLogin(user.id, new Date());

    this.eventEmitter.emit(AUDIT_EVENT, {
      userId: user.id,
      action: 'LOGIN',
      resource: 'AUTH',
      resourceId: sessionId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        organizationId: user.organizationId,
        roles,
        permissions,
      },
    };
  }
}
