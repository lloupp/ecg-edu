import { Body, Controller, Get, Headers, Post, UseGuards } from '@nestjs/common';
import { UserProfile } from '@ecg-edu/shared';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './auth.dto';
import { CurrentUser } from './auth.decorators';
import { AuthGuard } from './auth.guards';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() payload: RegisterDto) {
    return this.authService.register(payload);
  }

  @Post('login')
  login(@Body() payload: LoginDto) {
    return this.authService.login(payload);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: UserProfile) {
    return user;
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  async logout(@Headers('authorization') authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '').trim() ?? '';
    return this.authService.logout(token);
  }
}
