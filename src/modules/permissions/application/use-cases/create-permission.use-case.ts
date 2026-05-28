import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreatePermissionDto } from '../dtos/create-permission.dto';
import { PermissionResponseDto } from '../dtos/permission-response.dto';
import { PERMISSION_REPOSITORY } from '../../../../shared/constants/injection-tokens';
import { PermissionRepository } from '../../domain/repositories/permission.repository';
import { AUDIT_EVENT } from '../../../audit/application/events/audit.event';
import { ResourceConflictException } from '../../../../shared/exceptions/domain.exception';
import { PermissionMapper } from '../../infrastructure/mappers/permission.mapper';

@Injectable()
export class CreatePermissionUseCase {
  constructor(
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissionRepository: PermissionRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: CreatePermissionDto, actorId?: string): Promise<PermissionResponseDto> {
    const existing = await this.permissionRepository.findByName(dto.name);
    if (existing) throw new ResourceConflictException('Permissão já existe');

    const permission = await this.permissionRepository.create(dto);
    this.eventEmitter.emit(AUDIT_EVENT, {
      userId: actorId,
      action: 'PERMISSION_CREATE',
      resource: 'PERMISSION',
      resourceId: permission.id,
      metadata: { name: permission.name },
    });
    return PermissionMapper.toResponse(permission);
  }
}
