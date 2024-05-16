import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class User {
  @Prop({
    required: [true, 'User name is required'],
    trim: true,
  })
  name: string;

  @Prop({
    required: [true, 'User email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function (v) {
        return /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
          v,
        );
      },
      message: '{VALUE} is not a valid email address!',
    },
  })
  email: string;

  @Prop({ minlength: 8, select: false })
  password: string;

  @Prop({
    required: false,
    default: null,
  })
  passwordUpdatedAt?: Date;

  @Prop({
    required: false,
    default: null,
  })
  profilePicture?: string;
}

export type UserDocument = HydratedDocument<User>;

export const UserSchema = SchemaFactory.createForClass(User);
