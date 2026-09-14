import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums';

export const AUTH_ROLES_KEY = 'authRoles';

export const AuthRoles = (...roles: UserRole[]) =>
  SetMetadata(AUTH_ROLES_KEY, roles);
