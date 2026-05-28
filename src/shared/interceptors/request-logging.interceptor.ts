import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const { method, originalUrl } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - start;
          this.logger.log(`${method} ${originalUrl} ${response.statusCode} - ${ms}ms`);
        },
        error: (err) => {
          const ms = Date.now() - start;
          this.logger.warn(
            `${method} ${originalUrl} ${(err as { status?: number }).status ?? 500} - ${ms}ms`,
          );
        },
      }),
    );
  }
}
