import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Res,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Response } from 'express';
import jwtConfig from '../configs/jwt.config';
import { REFRESH_TOKEN_COOKIE_KEY } from '../iam.constants';
import { AuthenticationService } from './authentication.service';
import { Auth } from './decorators/auth.decorator';
import { RefreshToken } from './decorators/refresh-token.decorator';
import { SignInDto } from './dtos/sign-in.dto';
import { SignUpDto } from './dtos/sign-up.dto';
import { AuthTypes } from './types/auth-type.type';

@Controller('auth')
export class AuthenticationController {
  constructor(
    private readonly authService: AuthenticationService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}

  @Post('signup')
  @Auth(AuthTypes.None)
  async signUp(
    @Body() signUpDto: SignUpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } =
      await this.authService.signUp(signUpDto);

    this.__setRefreshTokenCookie(res, refreshToken);
    return {
      accessToken,
    };
  }

  @Post('signin')
  @Auth(AuthTypes.None)
  @HttpCode(HttpStatus.OK)
  async signIn(
    @Body() signInDto: SignInDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } =
      await this.authService.signIn(signInDto);

    this.__setRefreshTokenCookie(res, refreshToken);
    return {
      accessToken,
    };
  }

  @Get('signout')
  @HttpCode(HttpStatus.OK)
  @Auth(AuthTypes.None)
  async signOut(
    @Res({ passthrough: true }) res: Response,
    @RefreshToken() refreshToken: string,
  ) {
    this.__setRefreshTokenCookie(res, null);

    return this.authService.signOut(refreshToken);
  }

  @Get('refresh')
  @Auth(AuthTypes.None)
  async refreshTheToken(
    @Res({ passthrough: true }) res: Response,
    @RefreshToken() refreshToken: string,
  ) {
    const { accessToken, refreshToken: newRefreshToken } =
      await this.authService.refreshTheToken(refreshToken);

    this.__setRefreshTokenCookie(res, newRefreshToken);
    return {
      accessToken,
    };
  }

  private __setRefreshTokenCookie(res: Response, value: string | null) {
    const maxAge = value
      ? Date.now() + this.jwtConfiguration.refreshTtl * 1000
      : 0;
    res.cookie(REFRESH_TOKEN_COOKIE_KEY, value, {
      httpOnly: true,
      maxAge,
      priority: 'high',
      // secure: true, // > in production
    });
  }

  // @Post('forgot-password')
  // @Auth(AuthTypes.None)
  // forgotPassword(@Body() { email }: ReceiveUserEmailDto) {
  //   return this.authService.forgetPassword({ email });
  // }

  // @Post('reset-password')
  // @Auth(AuthTypes.None)
  // resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
  //   return this.authService.resetPassword(resetPasswordDto);
  // }
}
