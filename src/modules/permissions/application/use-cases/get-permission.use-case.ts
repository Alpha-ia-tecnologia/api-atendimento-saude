import { Inject, Injectable } from '@nestjs/common';
import { PERMISSION_REPOSITORY } from '../../../../shared/constants/injection-tokens';
import { PermissionRepository } from '../../domain/repositories/permission.repository';
import { ResourceNotFoundException } from '../../../../shared/exceptions/domain.exception';
import { PermissionMapper } from '../../infrastructure/mappers/permission.mapper';
import { PermissionResponseDto } from '../dtos/permission-response.dto';

@Injectable()
export class GetPermissionUseCase {
  constructor(
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissionRepository: PermissionRepository,
  ) {}

  async execute(id: string): Promise<PermissionResponseDto> {
    const permission = await this.permissionRepository.findById(id);
    if (!permission) throw new ResourceNotFoundException('Permissão');
    return PermissionMapper.toResponse(permission);
  }
}
