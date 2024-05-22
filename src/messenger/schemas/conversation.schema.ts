import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as SCHEMA } from 'mongoose';
import { User } from 'src/user/schemas/users.schema';
import { Message } from './message.schema';

@Schema({ timestamps: true })
export class Conversation {
  @Prop({
    type: SCHEMA.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  from: User;

  @Prop({
    type: SCHEMA.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  to: User;

  @Prop({
    type: [
      {
        type: SCHEMA.Types.ObjectId,
        ref: 'Message',
      },
    ],
    default: [],
    required: true,
  })
  messages: Message[];

  @Prop({
    type: SCHEMA.Types.ObjectId,
    ref: 'Message',
    default: null,
    required: true,
  })
  lastMessage: Message;

  createdAt: Date;
  updatedAt: Date;
}

export type ConversationDocument = HydratedDocument<Conversation>;
export const ConversationSchema = SchemaFactory.createForClass(Conversation);
