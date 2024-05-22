import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { AnyKeys, Model, ProjectionType, isValidObjectId } from 'mongoose';
import { AccessTokenPayload } from 'src/iam/authentication/types/token-payload.type';
import { User, UserDocument } from './schemas/users.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly UserModel: Model<User>,
    private readonly jwtService: JwtService,
  ) {}

  get model() {
    return this.UserModel;
  }

  getAll(): Promise<UserDocument[]> {
    return this.UserModel.find().exec();
  }

  getUserById(id: string, projection: ProjectionType<User> = {}) {
    if (!isValidObjectId(id)) return null;
    return this.UserModel.findById(id).select(projection).exec();
  }
  getUserByEmail(email: string, projection: ProjectionType<User> = {}) {
    return this.UserModel.findOne({ email }).select(projection).exec();
  }

  async getUserByJWTToken(token: string) {
    const decoded = <AccessTokenPayload>await this.jwtService.decode(token);
    if (!decoded?.id) return null;
    return this.getUserById(decoded.id);
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
    if (!isValidObjectId(id)) return null;
    return this.UserModel.findByIdAndUpdate(id, { $set: data }, { new: true })
      .select(projection)
      .exec();
  }

  deleteUser(id: string) {
    if (!isValidObjectId(id)) return null;
    return this.UserModel.deleteOne({ _id: id }).exec();
  }
}
