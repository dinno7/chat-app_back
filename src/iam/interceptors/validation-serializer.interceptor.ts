import {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ZodValidationException, validate } from 'nestjs-zod';
import { Observable, map } from 'rxjs';
import { SET_SERIALIZE_DTO_DECORATOR_KEY } from '../decorators/serialize.decorator';

const ErrorHandle = (e) => {
  console.error(
    '⭕️ ~ ERROR  ~ in server: src/iam/interceptors/validation-serializer.interceptor.ts ~> ❗',
    e,
  );
  return new ZodValidationException(e);
};

export class ValidationSerializerInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    const routeSerializeSchema = this.getContextResponseSchema(context);
    return next.handle().pipe(
      map((data) => {
        if (
          !routeSerializeSchema ||
          typeof data !== 'object' ||
          data instanceof StreamableFile
        )
          return data;

        if (context.getType() === 'ws') data = data.data;

        const result = Array.isArray(data)
          ? data.map((item) =>
              validate(item, routeSerializeSchema, ErrorHandle),
            )
          : validate(data, routeSerializeSchema, ErrorHandle);

        if (context.getType() === 'ws') {
          return {
            event: context.switchToWs().getPattern(),
            data: result,
          };
        }
        return result;
      }),
    );
  }
  getContextResponseSchema(context: ExecutionContext) {
    return new Reflector().getAllAndOverride(SET_SERIALIZE_DTO_DECORATOR_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  }
}
