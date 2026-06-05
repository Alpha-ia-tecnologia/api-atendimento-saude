import { Especialidade } from '@prisma/client';

import { EspecialidadeResponseDto } from './dtos/especialidade-response.dto';

export function mapEspecialidade(e: Especialidade): EspecialidadeResponseDto {
  return {
    id: e.id,
    nome: e.nome,
    tipo: e.tipo,
    descricao: e.descricao,
    icone: e.icone,
    disponivel: e.disponivel,
    ordem: e.ordem,
  };
}
