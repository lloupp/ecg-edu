import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { UserProfile, UserRole } from '@ecg-edu/shared';

export const PUBLIC = 'ecg-public';
export const ROLES = 'ecg-roles';
export const Public = () => SetMetadata(PUBLIC, true);
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES, roles);
export interface SessionRequest { headers: Record<string, string | string[] | undefined>; method: string; ip?: string; user?: UserProfile; }
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<SessionRequest>().user!);
export function sessionToken(request: SessionRequest) {
  const cookie = String(request.headers.cookie ?? '').split(';').map((c) => c.trim()).find((c) => c.startsWith('ecg_session='));
  const token = cookie?.slice('ecg_session='.length);
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : undefined;
}
export function allowedOrigins() {
  return (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://127.0.0.1:3000').split(',').map((origin) => origin.trim()).filter(Boolean);
}
