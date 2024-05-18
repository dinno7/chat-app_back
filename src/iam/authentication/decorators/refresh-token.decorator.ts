import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';
import { REFRESH_TOKEN_COOKIE_KEY } from 'src/iam/iam.constants';

export const RefreshToken = createParamDecorator(
  (data: never, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest() as Request;
    return req.cookies[REFRESH_TOKEN_COOKIE_KEY] ?? null;
  },
);
