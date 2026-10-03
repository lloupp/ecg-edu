import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service';
import { allowedOrigins, PUBLIC, ROLES, SessionRequest, sessionToken } from './access';
import { UserRole } from '@ecg-edu/shared';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly auth: AuthService) {}
  async canActivate(ctx: ExecutionContext) {
    const request = ctx.switchToHttp().getRequest<SessionRequest>();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      const origin = request.headers.origin;
      if ((origin && (Array.isArray(origin) || !allowedOrigins().includes(origin))) || request.headers['sec-fetch-site'] === 'cross-site') {
        throw new ForbiddenException('Origem da requisição não permitida');
      }
    }
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC, targets)) return true;
    const token = sessionToken(request);
    const user = token && await this.auth.sessionUser(token);
    if (!user) throw new UnauthorizedException('Faça login para continuar');
    request.user = user;
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES, targets);
    if (roles && !roles.includes(user.role)) throw new ForbiddenException('Perfil sem permissão para esta ação');
    return true;
  }
}
