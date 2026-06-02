import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsNotEmpty } from 'class-validator';

/**
 * Corpo do aprovar (agendar). O PDF do SISREG vai como arquivo `multipart`
 * (campo `file`), validado no controller — aqui só os campos de texto do form.
 */
export class AprovarSolicitacaoDto {
  @ApiProperty({
    description: 'Data/hora do agendamento (ISO 8601). Obrigatória.',
    example: '2026-06-10T14:30:00.000Z',
  })
  @IsNotEmpty({ message: 'Informe a data do agendamento.' })
  @IsISO8601({}, { message: 'Data do agendamento inválida.' })
  dataAgendada!: string;
}
