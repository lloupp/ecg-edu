import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { UserProfile, UserRole } from '@ecg-edu/shared';

export const AUTH_ROLES_KEY = 'auth_roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(AUTH_ROLES_KEY, roles);

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): UserProfile => {
  const request = context.switchToHttp().getRequest<{ authUser: UserProfile }>();
  return request.authUser;
});
