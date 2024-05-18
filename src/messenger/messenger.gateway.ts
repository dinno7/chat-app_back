import { BadGatewayException } from '@nestjs/common';
import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RedisService } from 'src/redis/redis.service';
import { UserService } from 'src/user/user.service';
import { ONLINE_USER_REDIS_SET_KEY } from './messenger.constants';
import { MESSENGER_EMITS } from './types/emits.type';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MessengerService
  implements OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private readonly redisService: RedisService,
    private readonly userService: UserService,
  ) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket, ...args: any[]) {
    const user = await this.userService.getUserByJWTToken(
      client.handshake.auth?.token,
    );
    if (!user?.id) throw new BadGatewayException('Token not valid!');

    //? Create a room
    client.join(user.id);

    await this.redisService.pushToSet(ONLINE_USER_REDIS_SET_KEY, user.id);

    this.server.emit(
      MESSENGER_EMITS.GetOnlineUsers,
      await this.__getAllOnlineUsers(),
    );

    console.log(`✨ new Connection `, client.id, args);
  }
  async handleDisconnect(client: Socket) {
    const user = await this.userService.getUserByJWTToken(
      client.handshake.auth?.token,
    );
    await this.redisService.removeElFromSet(ONLINE_USER_REDIS_SET_KEY, user.id);

    this.server.emit(
      MESSENGER_EMITS.GetOnlineUsers,
      await this.__getAllOnlineUsers(),
    );

    console.log(`✨ `, client.id + ' Disconnected');
  }
  private async __getAllOnlineUsers() {
    return [
      ...new Set(
        await this.redisService.getSetMembers(ONLINE_USER_REDIS_SET_KEY),
      ),
    ];
  }

  @SubscribeMessage('provideReceiverUserDetails')
  async giveReceiverUserDetails(@MessageBody() userId: string) {
    const user = await this.userService.getUserById(userId, [
      '-createdAt',
      '-updatedAt',
      '-__v',
    ]);
    const data = user.toJSON({
      transform(doc, ret) {
        ret.id = String(doc._id);
        delete ret._id;
      },
    });
    console.log(`✨ `, userId);

    return {
      event: 'consumeReceiverUserDetails',
      data,
    };
  }
}
