import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { UserProfile } from '@ecg-edu/shared';
import { AuthService, sessionLifetimeMs } from './auth.service';
import { LoginDto, RegisterDto } from './auth.dto';
import { CurrentUser, Public, SessionRequest, sessionToken } from './access';
interface CookieResponse { cookie(name: string, value: string, options: Record<string, unknown>): void; clearCookie(name: string, options: Record<string, unknown>): void; }
const cookieOptions = () => ({ httpOnly: true, sameSite: 'strict', secure: process.env.AUTH_COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production', path: '/api' });
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Public()
  @Post('login')
  async login(@Body() payload: LoginDto, @Req() request: SessionRequest, @Res({ passthrough: true }) response: CookieResponse) {
    return this.withCookie(await this.authService.login(payload, request.ip ?? 'unknown'), response);
  }
  @Public()
  @Post('register')
  async register(@Body() payload: RegisterDto, @Req() request: SessionRequest, @Res({ passthrough: true }) response: CookieResponse) {
    return this.withCookie(await this.authService.register(payload, request.ip ?? 'unknown'), response);
  }
  private withCookie(session: { user: UserProfile; token: string }, response: CookieResponse) {
    response.cookie('ecg_session', session.token, { ...cookieOptions(), maxAge: sessionLifetimeMs });
    return { user: session.user };
  }
  @Get('me')
  me(@CurrentUser() user: UserProfile) { return { user }; }
  @Post('logout')
  async logout(@Req() request: SessionRequest, @Res({ passthrough: true }) response: CookieResponse) {
    const token = sessionToken(request);
    if (token) await this.authService.logout(token);
    response.clearCookie('ecg_session', cookieOptions());
    return { success: true };
  }
}
