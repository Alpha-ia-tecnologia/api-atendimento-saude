import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtAccessPayload, AuthenticatedUser } from '../types/authenticated-user';
import { PrismaService } from '../database/prisma/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('Missing access token');

    let payload: JwtAccessPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtAccessPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    const session = await this.prisma.refreshToken.findFirst({
      where: { sessionId: payload.sessionId, revogadoEm: null },
      select: { id: true },
    });
    if (!session) {
      throw new UnauthorizedException('Session revoked');
    }

    request.user = {
      userId: payload.sub,
      email: payload.email,
      sessionId: payload.sessionId,
      roles: payload.roles ?? [],
      permissions: payload.permissions ?? [],
    };
    return true;
  }

  private extractToken(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (!header) return undefined;
    const [type, token] = header.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
