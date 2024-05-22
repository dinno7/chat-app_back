import { UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Model, isValidObjectId } from 'mongoose';
import { Server, Socket } from 'socket.io';
import { RedisService } from 'src/redis/redis.service';
import { UserDocument } from 'src/user/schemas/users.schema';
import { UserService } from 'src/user/user.service';
import { ActiveSocketUser } from 'src/ws/decorators/active-socket-user.decorator';
import { AuthenticationWsGuard } from 'src/ws/guards/authentication-ws.guard';
import { ONLINE_USER_REDIS_SET_KEY } from './messenger.constants';
import { Conversation } from './schemas/conversation.schema';
import { Message, MessageDocument } from './schemas/message.schema';
import { MESSENGER_EVENTS } from './types/emits.type';
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
    @InjectModel(Message.name) private readonly MessageModel: Model<Message>,
    @InjectModel(Conversation.name)
    private readonly ConversationModel: Model<Conversation>,
  ) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(@ConnectedSocket() client: Socket) {
    const user = await this.userService.getUserByJWTToken(
      client.handshake.auth?.token,
    );
    if (!user?.id) return;

    //? Create a room
    client.join(user.id);

    await this.redisService.pushToSet(ONLINE_USER_REDIS_SET_KEY, user.id);

    this.server.emit(
      MESSENGER_EVENTS.GetOnlineUsers,
      await this.__getAllOnlineUsers(),
    );

    console.log(`✨ new Connection `, client.id);
  }
  async handleDisconnect(@ConnectedSocket() client: Socket) {
    const user = await this.userService.getUserByJWTToken(
      client.handshake.auth?.token,
    );
    if (user?.id)
      await this.redisService.removeElFromSet(
        ONLINE_USER_REDIS_SET_KEY,
        user.id,
      );

    this.server.emit(
      MESSENGER_EVENTS.GetOnlineUsers,
      await this.__getAllOnlineUsers(),
    );

    console.log(`✨ `, client.id + ' Disconnected');
  }

  @SubscribeMessage('provideReceiverUserDetails')
  @UseGuards(AuthenticationWsGuard)
  async giveReceiverUserDetails(
    @ConnectedSocket() client: Socket,
    @ActiveSocketUser() activeUser: UserDocument,
    @MessageBody() receiverUserId: string,
  ) {
    if (!this.__isValidObjectIds(activeUser.id, receiverUserId))
      return {
        event: MESSENGER_EVENTS.ConsumeReceiverUserDetails,
        data: null,
      };

    const user = await this.userService.getUserById(receiverUserId);

    const conversationMessages = await this.__getConversationMessages(
      activeUser.id,
      receiverUserId,
    );
    client.emit(MESSENGER_EVENTS.Message, conversationMessages);

    return {
      event: MESSENGER_EVENTS.ConsumeReceiverUserDetails,
      data: {
        email: user?.email,
        id: user?.id,
        name: user?.name,
        profilePicture: user?.profilePicture,
      },
    };
  }

  private async __getAllOnlineUsers() {
    return [
      ...new Set(
        await this.redisService.getSetMembers(ONLINE_USER_REDIS_SET_KEY),
      ),
    ];
  }

  private async __getChatConversations(userId: string) {
    if (!this.__isValidObjectIds(userId)) return [];

    const conversations = await this.ConversationModel.find({
      $or: [{ from: userId }, { to: userId }],
    })
      .sort({
        updatedAt: -1,
      })
      .select(['id', 'to', 'from', 'lastMessage', 'updatedAt', 'messages'])
      .populate(['lastMessage', 'to', 'from', 'messages']);

    return conversations.map(
      ({ lastMessage, id, to, from, updatedAt, messages }) => {
        const unseenMessagesCount = messages.reduce(
          (acc, curr) =>
            String(curr.sender) !== userId ? acc + (!curr.seen ? 1 : 0) : acc,
          0,
        );

        const result = {
          id,
          lastMessage,
          updatedAt,
          unseenMessagesCount,
          user: {},
        };
        if (to.id === userId) result.user = from;
        else if (from.id === userId) result.user = to;

        return result;
      },
    );
  }

  private __isMessageValid(
    msg: MessageDocument & { from: string; to: string },
  ) {
    return (
      this.__isValidObjectIds(msg.from, msg.to) &&
      (msg.text || msg.videoUrl || msg.imageUrl)
    );
  }

  private async __getConversationMessages(from: string, to: string) {
    const conversation = await this.ConversationModel.findOne({
      $or: [
        { from: from, to: to },
        { from: to, to: from },
      ],
    }).select('_id');
    if (!conversation?._id) return [];

    const conversationMsgs = await this.MessageModel.find({
      conversation: conversation._id,
    })
      .sort({
        createdAt: -1,
      })
      .limit(100)
      .exec();

    return conversationMsgs
      .reduce(
        (
          acc,
          {
            conversation,
            sender,
            receiver,
            seen,
            text,
            imageUrl,
            videoUrl,
            id,
            createdAt,
          },
        ) =>
          (acc = [
            ...acc,
            {
              id,
              sender,
              receiver,
              seen,
              videoUrl,
              imageUrl,
              text,
              createdAt,
              conversation,
            },
          ]),
        [],
      )
      .reverse();
  }

  private __isValidObjectIds(...ids: string[]) {
    return ids.every((id) => isValidObjectId(id));
  }
}
