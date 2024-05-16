import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AnyKeys, Model, ProjectionType } from 'mongoose';
import { User, UserDocument } from './schemas/users.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly UserModel: Model<User>,
  ) {}
  getAll(): Promise<UserDocument[]> {
    return this.UserModel.find().exec();
  }

  getUserById(id: string, projection: ProjectionType<User> = {}) {
    return this.UserModel.findById(id).select(projection).exec();
  }
  getUserByEmail(email: string, projection: ProjectionType<User> = {}) {
    return this.UserModel.findOne({ email }).select(projection).exec();
  }

  async getUserByEmailOrName(nameOrEmail: string) {
    const pattern = new RegExp(nameOrEmail, 'ig');
    const users = await this.UserModel.find({
      $or: [{ email: pattern }, { name: pattern }],
    });
    return users;
  }

  createUser(user: User) {
    const newUser = new this.UserModel(user);
    return newUser.save();
  }

  updateUser(
    id: string,
    data: AnyKeys<User>,
    projection: ProjectionType<User> = {},
  ) {
    return this.UserModel.findByIdAndUpdate(id, { $set: data }, { new: true })
      .select(projection)
      .exec();
  }

  deleteUser(id: string) {
    return this.UserModel.deleteOne({ _id: id }).exec();
  }
}
