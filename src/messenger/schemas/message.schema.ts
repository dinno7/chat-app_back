import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as SCHEMA } from 'mongoose';
import { User } from 'src/user/schemas/users.schema';
import { Conversation } from './conversation.schema';

@Schema({
  timestamps: true,
  toObject: { virtuals: true },
  toJSON: { virtuals: true },
})
export class Message {
  @Prop({
    type: SCHEMA.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    default: null,
  })
  conversation: Conversation;

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

  @Prop()
  text: string;

  @Prop({
    required: false,
    default: null,
  })
  imageUrl?: string;

  @Prop({
    required: false,
    default: null,
  })
  videoUrl?: string;

  @Prop({
    required: true,
    default: false,
  })
  seen: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export type MessageDocument = HydratedDocument<Message>;
export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.virtual('id').get(function () {
  return this._id.toHexString();
});
