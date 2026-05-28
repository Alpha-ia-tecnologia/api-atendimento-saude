import { Inject, Injectable } from '@nestjs/common';
import { ROLE_REPOSITORY } from '../../../../shared/constants/injection-tokens';
import { RoleRepository } from '../../domain/repositories/role.repository';
import { ResourceNotFoundException } from '../../../../shared/exceptions/domain.exception';
import { RoleMapper } from '../../infrastructure/mappers/role.mapper';
import { RoleResponseDto } from '../dtos/role-response.dto';

@Injectable()
export class GetRoleUseCase {
  constructor(@Inject(ROLE_REPOSITORY) private readonly roleRepository: RoleRepository) {}

  async execute(id: string): Promise<RoleResponseDto> {
    const role = await this.roleRepository.findById(id);
    if (!role) throw new ResourceNotFoundException('Papel');
    return RoleMapper.toResponse(role);
  }
}
