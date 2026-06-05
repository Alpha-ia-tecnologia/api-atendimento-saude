import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientValidationError,
  Prisma.PrismaClientInitializationError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro ao processar a requisição';

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002': {
          status = HttpStatus.CONFLICT;
          const target = (exception.meta?.target as string[] | string | undefined) ?? 'campo';
          const field = Array.isArray(target) ? target.join(', ') : target;
          message = `Já existe um registro com este ${field}`;
          break;
        }
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Registro não encontrado';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message = 'Violação de chave estrangeira';
          break;
        default:
          this.logger.error(`Prisma error ${exception.code}: ${exception.message}`);
          status = HttpStatus.BAD_REQUEST;
          message = 'Erro de banco de dados';
      }
    } else if (exception instanceof Prisma.PrismaClientInitializationError) {
      this.logger.error('Database initialization failed', exception.stack);
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = 'Serviço indisponível';
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      this.logger.error(exception.message);
      status = HttpStatus.BAD_REQUEST;
      message = 'Dados inválidos';
    }

    response.status(status).json({
      success: false,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
