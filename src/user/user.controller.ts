import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ActiveUser } from 'src/iam/authentication/decorators/active-user.decorator';
import { Serialize } from 'src/iam/decorators/serialize.decorator';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UserSerializeSchema } from './dtos/user.serialize';
import { UserDocument } from './schemas/users.schema';
import { UserService } from './user.service';

@Controller('user')
@Serialize(UserSerializeSchema)
export class UserController {
  constructor(private readonly userService: UserService) {}
  @Get('me')
  getMe(@ActiveUser() user: UserDocument) {
    return user.toObject();
  }

  @Post('update')
  async updateUser(
    @ActiveUser() user: UserDocument,
    @Body() updateFields: UpdateUserDto,
  ) {
    const updatedUser = await this.userService.updateUser(
      user.id,
      updateFields,
    );

    return updatedUser;
  }

  @Get('find')
  findUsers(@Query('q') nameOrEmail: string) {
    if (!nameOrEmail.length) return [];
    return this.userService.getUserByEmailOrName(nameOrEmail);
  }
}
