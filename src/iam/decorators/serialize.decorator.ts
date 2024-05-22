import { SetMetadata, UseInterceptors, applyDecorators } from '@nestjs/common';
import { ZodDto } from 'nestjs-zod';
import { ZodSchema } from 'zod';
import { ValidationSerializerInterceptor } from '../interceptors/validation-serializer.interceptor';

export const SET_SERIALIZE_DTO_DECORATOR_KEY = 'serialize';

export const SetSerializerSchema = (dtoOrSchema: ZodDto | ZodSchema) =>
  SetMetadata(SET_SERIALIZE_DTO_DECORATOR_KEY, dtoOrSchema);

export const Serialize = (dtoOrSchema: ZodDto | ZodSchema) =>
  applyDecorators(
    SetSerializerSchema(dtoOrSchema),
    UseInterceptors(ValidationSerializerInterceptor),
  );
