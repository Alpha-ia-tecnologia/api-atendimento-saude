import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { TokenService } from '../services/token.service';
import { RefreshTokenDto } from '../dtos/refresh-token.dto';
import { AuthResponseDto } from '../dtos/auth-response.dto';
import {
  REFRESH_TOKEN_REPOSITORY,
  USER_REPOSITORY,
} from '../../../../shared/constants/injection-tokens';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import { UserRepository } from '../../../users/domain/repositories/user.repository';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly tokenService: TokenService,
  ) {}

  async execute(dto: RefreshTokenDto): Promise<AuthResponseDto> {
    let payload;
    try {
      payload = await this.tokenService.verifyRefreshToken(dto.refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    const persisted = await this.refreshTokenRepository.findActiveBySessionId(payload.sessionId);
    if (!persisted) throw new UnauthorizedException('Sessão revogada');

    const ok = await this.tokenService.matchesPersistedToken(dto.refreshToken, persisted.tokenHash);
    if (!ok) {
      await this.refreshTokenRepository.revokeBySessionId(payload.sessionId);
      throw new UnauthorizedException('Refresh token inválido');
    }

    const user = await this.userRepository.findWithRolesAndPermissions(payload.sub);
    if (!user || !user.isActive()) {
      await this.refreshTokenRepository.revokeBySessionId(payload.sessionId);
      throw new UnauthorizedException('Usuário inativo');
    }

    const roles = user.roleNames();
    const permissions = user.allPermissions();

    const newAccessToken = await this.tokenService.signAccessToken({
      sub: user.id,
      email: user.email,
      sessionId: payload.sessionId,
      roles,
      permissions,
    });

    const newRefreshToken = await this.tokenService.signRefreshToken({
      sub: user.id,
      sessionId: payload.sessionId,
    });

    await this.refreshTokenRepository.revokeBySessionId(payload.sessionId);
    await this.tokenService.persistRefreshToken(user.id, payload.sessionId, newRefreshToken);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
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
