import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { ZodValidationException } from 'nestjs-zod';

interface ErrorResponse {
  ok: boolean;
  error: string;
  message: string;
  timestamp: number;
  path: string;
  statusCode: number;
  [key: string]: any;
}
@Catch(HttpException, ZodValidationException)
export class ErrorFilter<T extends HttpException | ZodValidationException>
  implements ExceptionFilter
{
  catch(exception: T, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();
    const status = exception.getStatus();

    const errorResponse: ErrorResponse = {
      ok: false,
      error: exception.name,
      message: exception.message,
      statusCode: status,
      path: req.url,
      timestamp: new Date().valueOf(),
    };

    if (exception instanceof ZodValidationException) {
      const zodError = exception.getZodError().issues.map((issue) => ({
        ...issue,
        message: `${issue?.path?.join(' & ')}: ${issue?.message}`,
      }));
      errorResponse['errors'] = zodError;
      errorResponse['error'] = 'ValidationFailedException';
      errorResponse['message'] = zodError.reduce(
        (acc, curr, index) =>
          (acc += `${curr.message}${index === zodError.length - 1 ? '' : ', '}`),
        '',
      );
    }
    res.status(status).json(errorResponse);
  }
}
