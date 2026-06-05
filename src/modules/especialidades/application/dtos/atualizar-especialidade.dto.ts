import { PartialType } from '@nestjs/swagger';

import { CriarEspecialidadeDto } from './criar-especialidade.dto';

/** Todos os campos opcionais — atualização parcial. */
export class AtualizarEspecialidadeDto extends PartialType(CriarEspecialidadeDto) {}
