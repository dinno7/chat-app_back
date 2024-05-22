import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ErrorFilter } from './filters/error.filter';
import { GlobalResponsesSerializerInterceptor } from './interceptors/global-responses-serializer.interceptor';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: GlobalResponsesSerializerInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: ErrorFilter,
    },
  ],
})
export class CommonModule {}
