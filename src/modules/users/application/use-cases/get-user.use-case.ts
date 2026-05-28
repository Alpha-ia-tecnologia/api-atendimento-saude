import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY } from '../../../../shared/constants/injection-tokens';
import { UserRepository } from '../../domain/repositories/user.repository';
import { ResourceNotFoundException } from '../../../../shared/exceptions/domain.exception';
import { UserMapper } from '../../infrastructure/mappers/user.mapper';
import { UserResponseDto } from '../dtos/user-response.dto';

@Injectable()
export class GetUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository) {}

  async execute(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new ResourceNotFoundException('Usuário');
    return UserMapper.toResponse(user);
  }
}
