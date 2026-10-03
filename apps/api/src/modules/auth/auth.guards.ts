import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserProfile, UserRole } from '@ecg-edu/shared';
import { AUTH_ROLES_KEY } from './auth.decorators';
import { AuthService } from './auth.service';

type AuthRequest = {
  headers: { authorization?: string };
  authUser?: UserProfile;
  authToken?: string;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const header = request.headers.authorization;
    const match = header?.match(/^Bearer\s+(.+)$/i);
    if (!match) throw new UnauthorizedException('Autenticação necessária');
    const token = match[1].trim();
    const user = await this.authService.authenticate(token);
    request.authUser = user;
    request.authToken = token;
    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(AUTH_ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!roles?.length) return true;
    const request = context.switchToHttp().getRequest<AuthRequest>();
    return Boolean(request.authUser && roles.includes(request.authUser.role));
  }
}
