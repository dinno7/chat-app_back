import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class Message {
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
}

export type MessageDocument = HydratedDocument<Message>;
export const MessageSchema = SchemaFactory.createForClass(Message);
