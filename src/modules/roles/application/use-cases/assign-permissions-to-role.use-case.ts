import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AssignPermissionsToRoleDto } from '../dtos/assign-permissions-to-role.dto';
import { RoleResponseDto } from '../dtos/role-response.dto';
import {
  PERMISSION_REPOSITORY,
  ROLE_REPOSITORY,
} from '../../../../shared/constants/injection-tokens';
import { RoleRepository } from '../../domain/repositories/role.repository';
import { PermissionRepository } from '../../../permissions/domain/repositories/permission.repository';
import { AUDIT_EVENT } from '../../../audit/application/events/audit.event';
import { ResourceNotFoundException } from '../../../../shared/exceptions/domain.exception';
import { RoleMapper } from '../../infrastructure/mappers/role.mapper';

@Injectable()
export class AssignPermissionsToRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: RoleRepository,
    @Inject(PERMISSION_REPOSITORY) private readonly permissionRepository: PermissionRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    id: string,
    dto: AssignPermissionsToRoleDto,
    actorId?: string,
  ): Promise<RoleResponseDto> {
    const role = await this.roleRepository.findById(id);
    if (!role) throw new ResourceNotFoundException('Papel');

    const perms = await this.permissionRepository.findManyByIds(dto.permissionIds);
    if (perms.length !== dto.permissionIds.length) {
      throw new ResourceNotFoundException('Permissão');
    }

    const updated = await this.roleRepository.assignPermissions(id, dto.permissionIds);
    this.eventEmitter.emit(AUDIT_EVENT, {
      userId: actorId,
      action: 'ROLE_ASSIGN_PERMISSIONS',
      resource: 'ROLE',
      resourceId: id,
      metadata: { permissionIds: dto.permissionIds },
    });
    return RoleMapper.toResponse(updated);
  }
}
