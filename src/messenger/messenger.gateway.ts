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

  @UseGuards(AuthenticationWsGuard)
  @SubscribeMessage('message')
  async handleMessage(
    @ActiveSocketUser() activeUser: UserDocument,
    @MessageBody()
    message: MessageDocument & { from: string; to: string },
  ) {
    message.from = activeUser.id;
    if (!this.__isMessageValid(message))
      return { event: MESSENGER_EVENTS.MessageAck, data: false };

    const newMsg = new this.MessageModel({
      text: message.text,
      imageUrl: message.imageUrl,
      videoUrl: message.videoUrl,
      conversation: null,
      sender: activeUser.id,
      receiver: message.to,
      seen: String(activeUser.id) === String(message.to) ? true : false,
    });

    const conversation = await this.ConversationModel.findOneAndUpdate(
      {
        $or: [
          { from: activeUser.id, to: message.to },
          { from: message.to, to: activeUser.id },
        ],
      },
      {
        $push: { messages: newMsg._id },
        $set: {
          lastMessage: newMsg._id,
        },
        $setOnInsert: {
          from: activeUser.id,
          to: message.to,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        projection: 'messages',
      },
    );

    // @ts-expect-error Can not detect Conversation as a objectId
    newMsg.conversation = conversation._id;
    await newMsg.save();

    await conversation.populate([
      {
        path: 'messages',
      },
    ]);

    const [activeUserUpdatedConversations, anotherUserUpdatedConversations] = (
      await Promise.allSettled([
        this.__getChatConversations(activeUser.id),
        this.__getChatConversations(message.to),
      ])
    ).map((c) => c.status === 'fulfilled' && c.value);

    this.server
      .to(message.to)
      .emit(MESSENGER_EVENTS.Message, conversation.messages);
    this.server
      .to(message.to)
      .emit(
        MESSENGER_EVENTS.GetChatConversations,
        anotherUserUpdatedConversations,
      );

    if (activeUser.id !== message.to) {
      this.server
        .to(activeUser.id)
        .emit(MESSENGER_EVENTS.Message, conversation.messages);
      this.server
        .to(activeUser.id)
        .emit(
          MESSENGER_EVENTS.GetChatConversations,
          activeUserUpdatedConversations,
        );
    }

    return { event: MESSENGER_EVENTS.MessageAck, data: true };
  }

  @UseGuards(AuthenticationWsGuard)
  @SubscribeMessage('getChatConversations')
  async handleChatConversations(@ActiveSocketUser() user: UserDocument) {
    const data = await this.__getChatConversations(user.id);
    return { event: MESSENGER_EVENTS.GetChatConversations, data };
  }

  @UseGuards(AuthenticationWsGuard)
  @SubscribeMessage('seen')
  async handleSeen(
    @ActiveSocketUser() activeUser: UserDocument,
    @MessageBody() receiverUserId: string,
  ) {
    const conversation = await this.ConversationModel.findOne({
      $or: [
        { to: receiverUserId, from: activeUser.id },
        { to: activeUser.id, from: receiverUserId },
      ],
    });
    if (conversation?.messages)
      await this.MessageModel.updateMany(
        {
          _id: { $in: conversation.messages },
          sender: receiverUserId,
        },
        {
          $set: {
            seen: true,
          },
        },
      );

    await conversation.populate('messages');

    this.server
      .to(receiverUserId)
      .emit(MESSENGER_EVENTS.Message, conversation.messages);

    const conversations = await this.__getChatConversations(activeUser.id);
    return {
      event: MESSENGER_EVENTS.GetChatConversations,
      data: conversations,
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
