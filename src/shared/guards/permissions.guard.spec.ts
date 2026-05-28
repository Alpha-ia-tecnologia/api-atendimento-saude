import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';

function buildContext(user: { permissions: string[] } | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  it('libera quando não há permissões exigidas', () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const guard = new PermissionsGuard(reflector);
    expect(guard.canActivate(buildContext({ permissions: [] }))).toBe(true);
  });

  it('bloqueia quando usuário não tem todas as permissões', () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['USER_CREATE', 'USER_DELETE']);
    const guard = new PermissionsGuard(reflector);
    expect(() => guard.canActivate(buildContext({ permissions: ['USER_CREATE'] }))).toThrow(
      ForbiddenException,
    );
  });

  it('libera quando usuário tem todas as permissões exigidas', () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['USER_CREATE']);
    const guard = new PermissionsGuard(reflector);
    expect(guard.canActivate(buildContext({ permissions: ['USER_CREATE', 'USER_VIEW'] }))).toBe(
      true,
    );
  });

  it('lança Forbidden quando request.user ausente', () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['USER_CREATE']);
    const guard = new PermissionsGuard(reflector);
    expect(() => guard.canActivate(buildContext(undefined))).toThrow(ForbiddenException);
  });
});
