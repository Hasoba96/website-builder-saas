import {
  Catch,
  HttpException,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { ServerResponse } from 'node:http';
import {
  StructuredLogger,
  failure,
  responseRequestId,
  send,
} from '@website-builder/observability';

@Catch()
export class SafeErrorFilter implements ExceptionFilter {
  constructor(readonly logger: StructuredLogger) {}
  catch(error: unknown, host: ArgumentsHost) {
    const status = error instanceof HttpException ? error.getStatus() : 500;
    const code =
      status === 400
        ? 'MALFORMED_REQUEST'
        : status === 422
          ? 'VALIDATION_FAILED'
          : status === 404
            ? 'NOT_FOUND'
            : status === 503
              ? 'NOT_READY'
              : 'INTERNAL_ERROR';
    const safeStatus = code === 'INTERNAL_ERROR' ? 500 : status;
    const response = host.switchToHttp().getResponse<ServerResponse>();
    if (safeStatus >= 500)
      this.logger.emit(
        safeStatus === 503 ? 'dependency_unavailable' : 'unexpected_error',
        { code },
      );
    send(response, safeStatus, failure(code, responseRequestId(response)));
  }
}
