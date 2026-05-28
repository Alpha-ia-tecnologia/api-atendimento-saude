import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface StandardResponse<T> {
  success: true;
  message: string;
  data: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, StandardResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<StandardResponse<T>> {
    return next.handle().pipe(
      map((payload) => {
        if (
          payload &&
          typeof payload === 'object' &&
          'success' in (payload as Record<string, unknown>)
        ) {
          return payload as unknown as StandardResponse<T>;
        }
        const message =
          payload && typeof payload === 'object' && 'message' in (payload as Record<string, unknown>)
            ? ((payload as Record<string, unknown>).message as string)
            : 'Operação realizada com sucesso';
        const data =
          payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>)
            ? ((payload as Record<string, unknown>).data as T)
            : (payload as T);
        return { success: true, message, data };
      }),
    );
  }
}
