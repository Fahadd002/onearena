export type PolicyUser = {
  role?: string;
  userId?: string;
  status?: string;
  isDeleted?: boolean;
};

export type ResourceContext = {
  ownerId?: string;
  managerId?: string;
};

export function isUserActiveForAuth(user: Pick<PolicyUser, 'status' | 'isDeleted'>): boolean {
  if (user.isDeleted) {
    return false;
  }

  return user.status === 'ACTIVE';
}

export function canUserAccessResource(
  user: PolicyUser,
  resource: ResourceContext,
): boolean {
  const role = user.role ?? 'USER';

  if (role === 'SUPER_ADMIN') {
    return true;
  }

  if (role === 'ADMIN') {
    return Boolean(resource.ownerId) && user.userId === resource.ownerId;
  }

  if (role === 'MANAGER') {
    return Boolean(resource.managerId) && user.userId === resource.managerId;
  }

  return false;
}
