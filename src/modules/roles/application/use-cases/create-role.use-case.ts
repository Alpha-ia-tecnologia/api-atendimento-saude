import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateRoleDto } from '../dtos/create-role.dto';
import { RoleResponseDto } from '../dtos/role-response.dto';
import {
  PERMISSION_REPOSITORY,
  ROLE_REPOSITORY,
} from '../../../../shared/constants/injection-tokens';
import { RoleRepository } from '../../domain/repositories/role.repository';
import { PermissionRepository } from '../../../permissions/domain/repositories/permission.repository';
import { AUDIT_EVENT } from '../../../audit/application/events/audit.event';
import {
  ResourceConflictException,
  ResourceNotFoundException,
} from '../../../../shared/exceptions/domain.exception';
import { RoleMapper } from '../../infrastructure/mappers/role.mapper';

@Injectable()
export class CreateRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: RoleRepository,
    @Inject(PERMISSION_REPOSITORY) private readonly permissionRepository: PermissionRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: CreateRoleDto, actorId?: string): Promise<RoleResponseDto> {
    const existing = await this.roleRepository.findByName(dto.name);
    if (existing) throw new ResourceConflictException('Papel já existe');

    if (dto.permissionIds && dto.permissionIds.length > 0) {
      const perms = await this.permissionRepository.findManyByIds(dto.permissionIds);
      if (perms.length !== dto.permissionIds.length) {
        throw new ResourceNotFoundException('Permissão');
      }
    }

    const role = await this.roleRepository.create(dto);
    this.eventEmitter.emit(AUDIT_EVENT, {
      userId: actorId,
      action: 'ROLE_CREATE',
      resource: 'ROLE',
      resourceId: role.id,
      metadata: { name: role.name },
    });
    return RoleMapper.toResponse(role);
  }
}
