import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { Auth } from './decorators/auth.decorator';
import { RefreshTokenDto } from './dtos/refresh-token.dto';
import { SignInDto } from './dtos/sign-in.dto';
import { SignOutDto } from './dtos/sign-out.dto';
import { SignUpDto } from './dtos/sign-up.dto';
import { AuthTypes } from './types/auth-type.type';

@Controller('auth')
export class AuthenticationController {
  constructor(private readonly authService: AuthenticationService) {}

  @Post('signup')
  @Auth(AuthTypes.None)
  async signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  @Post('signin')
  @Auth(AuthTypes.None)
  @HttpCode(HttpStatus.OK)
  async signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto);
  }

  @Post('signout')
  @HttpCode(HttpStatus.OK)
  async signOut(@Body() { refreshToken }: SignOutDto) {
    return this.authService.signOut(refreshToken);
  }

  @Post('refresh')
  @Auth(AuthTypes.None)
  refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto);
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
