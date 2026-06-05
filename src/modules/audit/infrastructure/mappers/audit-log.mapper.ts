import { AuditLogComOperador } from '../../domain/repositories/audit-log.repository';
import { AuditLogResponseDto } from '../../application/dtos/audit-log-response.dto';

export class AuditLogMapper {
  static toResponse(record: AuditLogComOperador): AuditLogResponseDto {
    return {
      id: record.id,
      usuarioCrmId: record.usuarioCrmId,
      operador: record.usuarioCrm
        ? { nomeCompleto: record.usuarioCrm.nomeCompleto, email: record.usuarioCrm.email }
        : null,
      acao: record.acao,
      recurso: record.recurso,
      recursoId: record.recursoId,
      ipAddress: record.ipAddress,
      userAgent: record.userAgent,
      metadata: record.metadata,
      criadoEm: record.criadoEm,
    };
  }
}
