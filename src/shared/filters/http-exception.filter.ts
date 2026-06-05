import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface FieldError {
  field: string;
  message: string;
}

interface ErrorBody {
  success: false;
  message: string;
  errors?: FieldError[];
  /** Lista de problemas de domínio (ex.: validação de fluxo). */
  problemas?: string[];
  timestamp: string;
  path: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: FieldError[] | undefined;
    let problemas: string[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const r = res as Record<string, unknown>;
        const rawMessage = r.message;
        if (Array.isArray(rawMessage)) {
          message = 'Erro de validação';
          errors = rawMessage.map((m) => this.toFieldError(m));
        } else if (typeof rawMessage === 'string') {
          message = rawMessage;
        }
        if (typeof r.error === 'string' && !errors && message === 'Internal server error') {
          message = r.error;
        }
        if (Array.isArray(r.problemas)) {
          problemas = r.problemas.filter((p): p is string => typeof p === 'string');
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status} ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const body: ErrorBody = {
      success: false,
      message,
      ...(errors ? { errors } : {}),
      ...(problemas ? { problemas } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(body);
  }

  private toFieldError(raw: unknown): FieldError {
    if (typeof raw === 'string') {
      const [field] = raw.split(' ');
      return { field, message: raw };
    }
    if (typeof raw === 'object' && raw !== null) {
      const o = raw as Record<string, unknown>;
      return {
        field: typeof o.property === 'string' ? o.property : 'unknown',
        message: typeof o.message === 'string' ? o.message : 'Invalid value',
      };
    }
    return { field: 'unknown', message: 'Invalid value' };
  }
}
