import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { RedisService } from 'src/redis/redis.service';
import { UserService } from 'src/user/user.service';
import jwtConfig from '../configs/jwt.config';
import { HashingService } from '../hashing/hashing.service';
import { SignInDto } from './dtos/sign-in.dto';
import { SignUpDto } from './dtos/sign-up.dto';
import { InvalidRefreshTokenException } from './exceptions/invalid-refresh-token.exeption';
import { RefreshTokenPayload } from './types/token-payload.type';

@Injectable()
export class AuthenticationService {
  constructor(
    @Inject(jwtConfig.KEY)
    private readonly jwtConfigurations: ConfigType<typeof jwtConfig>,
    private readonly jwtService: JwtService,
    private readonly hashingService: HashingService,
    private readonly userService: UserService,
    private readonly redisService: RedisService,
  ) {}

  async signUp(signUpDto: SignUpDto) {
    const isUserExist = await this.userService.getUserByEmail(signUpDto.email);
    if (isUserExist)
      throw new BadRequestException(
        `User by this email(${signUpDto.email}) is already exist`,
      );

    const hashedPassword = await this.hashingService.hash(signUpDto.password);

    const user = await this.userService.createUser({
      name: signUpDto.name,
      email: signUpDto.email,
      password: hashedPassword,
      profilePicture: '/images/user_default.png',
    });

    return this.__generateTokens(user.id);
  }
  async signIn(signInDto: SignInDto) {
    const errorMsg = 'This email and password combination is not valid';

    const user = await this.userService.getUserByEmail(
      signInDto.email,
      '+password',
    );
    if (!user) throw new NotFoundException(errorMsg);

    const isPasswordValid = await this.hashingService.compare(
      signInDto.password,
      user.password,
    );
    if (!isPasswordValid) throw new BadRequestException(errorMsg);

    const { accessToken, refreshToken } = await this.__generateTokens(user.id);

    return {
      accessToken,
      refreshToken,
    };
  }

  async signOut(refreshToken: string) {
    try {
      const {
        type,
        tokenId,
        id: userId,
      } = <RefreshTokenPayload>await this.jwtService.decode(refreshToken);
      if (type !== 'refresh' || !userId || !tokenId) throw new Error();

      if (!(await this.redisService.get(tokenId))) throw new Error();

      const user = await this.userService.getUserById(userId);
      if (!user) throw new Error();

      if (!(await this.redisService.remove(tokenId))) throw new Error();
      return true;
    } catch (error) {
      console.error(
        '⭕️ ~ ERROR  ~ in server: src/iam/authentication/authentication.service.ts ~> ❗',
        error,
      );
      throw new BadRequestException('Invalid refresh token');
    }
  }

  async refreshTheToken(receivedToken: string) {
    try {
      const {
        type,
        tokenId,
        id: userId,
      } = <RefreshTokenPayload>await this.jwtService.verifyAsync(
        receivedToken,
        {
          secret: this.jwtConfigurations.refreshTokenSecret,
          audience: this.jwtConfigurations.audience,
          issuer: this.jwtConfigurations.issuer,
        },
      );

      if (type !== 'refresh') throw new Error();

      const user = await this.userService.getUserById(userId);
      if (!user) throw new Error();

      const isRefreshTokenValid = await this.redisService.validate(
        tokenId,
        receivedToken,
      );

      // -> It's mean one malicious user will try to use refresh token(Auto Reuse Detection)
      if (!isRefreshTokenValid)
        throw new InvalidRefreshTokenException('Access denied');

      // -> Just sure that refresh token will be remove successfully
      if (!(await this.redisService.remove(tokenId))) throw new Error();

      return this.__generateTokens(userId);
    } catch (err) {
      if (err instanceof InvalidRefreshTokenException) {
        //-> Notify user that refresh token was stolen and get hacked
        throw err;
      }
      throw new BadRequestException(
        'Your session has timed out, you must login again',
      );
    }
  }

  // async forgetPassword({ email }: ReceiveUserEmailDto) {
  //   try {
  //     const user = await this.userService.getUserByEmail(email);
  //     if (!user)
  //       throw new NotFoundException(
  //         `User with this email(${email}) was not found`,
  //       );

  //     const resetToken = Buffer.from(`${user.id}.${randomUUID()}`).toString(
  //       'base64',
  //     );
  //     const resetPasswordUrl = `http://localhost:3000/reset-password/${resetToken}`;

  //     const hashedToken = await this.hashingService.hash(resetToken);

  //     await this.forgotPasswordService.upsert(user.id, hashedToken);

  //     setImmediate(async () => {
  //       await this.mailService
  //         .send({
  //           to: user.email,
  //           subject: 'Reset your password',
  //           html: 'forgot-password',
  //           htmlInput: {
  //             userName: user.name,
  //             resetPasswordUrl,
  //           },
  //         })
  //         .catch((error) => {
  //           console.error(
  //             '⭕️ ~ ERROR  ~ in auth_prisma: src/iam/authentication/authentication.service.ts ~> ❗',
  //             error,
  //           );
  //         });
  //     });
  //     return `We sent reset password url to your email(${user.email}), Check your email and follow the instruction`;
  //   } catch (error) {
  //     if (error instanceof HttpException) throw error;
  //     throw new InternalServerErrorException('Something went wrong');
  //   }
  // }
  // async resetPassword({ token, password }: ResetPasswordDto) {
  //   try {
  //     const [userId] = Buffer.from(token, 'base64').toString('utf8').split('.');

  //     const user = await this.userService.getUserById(userId, {
  //       forgotPassword: { select: { expires: true, token: true } },
  //     });
  //     if (!user) throw new Error();

  //     const userResetPasswordHashed = user.forgotPassword?.token;
  //     if (!userResetPasswordHashed) throw new Error();
  //     const isResetLinkExpires = this.forgotPasswordService.isExpires(
  //       user.forgotPassword,
  //     );
  //     const isResetTokenValid = await this.hashingService.compare(
  //       token,
  //       userResetPasswordHashed,
  //     );

  //     if (!isResetTokenValid) throw new Error();
  //     if (isResetLinkExpires) throw new Error('Reset password url is expires');

  //     // -> User password should be change here:
  //     const newUserHashedPassword = await this.hashingService.hash(password);
  //     await this.prisma.$transaction([
  //       // > Update user password
  //       this.userService.updateUser(user.id, {
  //         password: newUserHashedPassword,
  //         passwordUpdatedAt: new Date(),
  //       }),
  //       // > Remove related Forgot password:
  //       this.forgotPasswordService.deleteByUserId(user.id),
  //     ]);

  //     return 'User password updated successfully';
  //   } catch (error) {
  //     throw new BadRequestException(
  //       error?.message?.length ? error.message : 'Reset token is not valid',
  //     );
  //   }
  // }

  private __signToken<P extends Record<string, unknown> | Buffer>(
    secret: string,
    expiresIn: number,
    payload: P,
  ): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret,
      expiresIn,
      audience: this.jwtConfigurations.audience,
      issuer: this.jwtConfigurations.issuer,
    });
  }

  private async __generateTokens(userId: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const refreshTokenId = `user_${randomUUID()}`;

    const [accessToken, refreshToken] = await Promise.all([
      this.__signToken(
        this.jwtConfigurations.secret,
        this.jwtConfigurations.accessTtl,
        {
          type: 'access',
          id: userId,
        },
      ),
      this.__signToken(
        this.jwtConfigurations.refreshTokenSecret,
        this.jwtConfigurations.refreshTtl,
        {
          type: 'refresh',
          id: userId,
          tokenId: refreshTokenId,
        },
      ),
    ]);

    // -> Add refresh token to memory for refresh token auto detection
    this.redisService.insert(refreshTokenId, refreshToken);

    return {
      accessToken,
      refreshToken,
    };
  }
}
