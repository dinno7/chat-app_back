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
  sender: User;

  @Prop({
    type: SCHEMA.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  receiver: User;

  @Prop({
    type: [
      {
        type: SCHEMA.Types.ObjectId,
        ref: 'Message',
      },
    ],
    required: true,
  })
  message: Message[];
}

export type ConversationDocument = HydratedDocument<Conversation>;
export const ConversationSchema = SchemaFactory.createForClass(Conversation);
