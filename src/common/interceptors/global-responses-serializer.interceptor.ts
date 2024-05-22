import { Injectable, NestInterceptor } from '@nestjs/common';
import { map } from 'rxjs';

@Injectable()
export class GlobalResponsesSerializerInterceptor implements NestInterceptor {
  intercept(context, next) {
    return next.handle().pipe(
      map((data) => {
        const result = {
          ok: true,
          timestamp: new Date().getTime(),
          data,
        };

        return result;
      }),
    );
  }
}
