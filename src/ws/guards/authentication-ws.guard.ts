import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { UserService } from 'src/user/user.service';
import { ACTIVE_USER_SOCKET_KEY } from '../ws.contants';

@Injectable()
export class AuthenticationWsGuard implements CanActivate {
  constructor(private readonly userService: UserService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const socketClient = context.switchToWs().getClient() as Socket;
    const token = socketClient.handshake.auth?.token;

    if (!token) return false;

    const user = await this.userService.getUserByJWTToken(token);
    socketClient.data[ACTIVE_USER_SOCKET_KEY] = user;

    return true;
  }
}
