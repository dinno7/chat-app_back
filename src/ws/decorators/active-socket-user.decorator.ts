import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Socket } from 'socket.io';
import { User, UserDocument } from 'src/user/schemas/users.schema';
import { ACTIVE_USER_SOCKET_KEY } from '../ws.contants';

export const ActiveSocketUser = createParamDecorator(
  (data: keyof User, ctx: ExecutionContext) => {
    const client = ctx.switchToWs().getClient() as Socket;
    const user = client.data[ACTIVE_USER_SOCKET_KEY] as UserDocument;
    return user ? (data ? user[data] : user) : null;
  },
);
