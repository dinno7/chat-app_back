import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { REQUEST_USER_KEY } from 'src/iam/iam.constants';
import { User, UserDocument } from 'src/user/schemas/users.schema';

export const ActiveUser = createParamDecorator(
  (data: keyof User, ctx: ExecutionContext) => {
    const user = ctx.switchToHttp().getRequest()[
      REQUEST_USER_KEY
    ] as UserDocument;
    return user ? (data ? user[data] : user) : null;
  },
);
