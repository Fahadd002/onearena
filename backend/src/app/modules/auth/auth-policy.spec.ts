import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canUserAccessResource,
  isUserActiveForAuth,
} from './auth-policy';

test('suspended or deleted users are rejected from protected auth flows', () => {
  assert.equal(
    isUserActiveForAuth({ status: 'ACTIVE', isDeleted: false }),
    true,
  );
  assert.equal(
    isUserActiveForAuth({ status: 'SUSPENDED', isDeleted: false }),
    false,
  );
  assert.equal(
    isUserActiveForAuth({ status: 'BLOCKED', isDeleted: false }),
    false,
  );
  assert.equal(
    isUserActiveForAuth({ status: 'ACTIVE', isDeleted: true }),
    false,
  );
});

test('server-side resource checks enforce ownership and assignment', () => {
  assert.equal(
    canUserAccessResource(
      { role: 'SUPER_ADMIN', userId: 'admin-1' },
      { ownerId: 'owner-1', managerId: 'mgr-1' },
    ),
    true,
  );

  assert.equal(
    canUserAccessResource(
      { role: 'ADMIN', userId: 'owner-1' },
      { ownerId: 'owner-1', managerId: 'mgr-1' },
    ),
    true,
  );

  assert.equal(
    canUserAccessResource(
      { role: 'ADMIN', userId: 'owner-2' },
      { ownerId: 'owner-1', managerId: 'mgr-1' },
    ),
    false,
  );

  assert.equal(
    canUserAccessResource(
      { role: 'MANAGER', userId: 'mgr-1' },
      { ownerId: 'owner-1', managerId: 'mgr-1' },
    ),
    true,
  );
});
