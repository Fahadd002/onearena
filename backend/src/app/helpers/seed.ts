import { randomBytes, randomUUID } from 'crypto';
import { hashPassword } from 'better-auth/crypto';
import prisma from '../../shared/prisma';
import {
  UserStatus,
  UserRole,
} from '../../generated/prisma/enums';

async function createOrUpdateUser(
  email: string,
  data: {
    name: string;
    role: UserRole;
    status: UserStatus;
    emailVerified: boolean;
    needPasswordChange: boolean;
  }
) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return prisma.user.update({ where: { email }, data });
  }
  return prisma.user.create({ data: { email, ...data } });
}

async function createOrUpdateAccount(userId: string, password: string) {
  const existing = await prisma.account.findFirst({ where: { userId } });
  const hashedPassword = await hashPassword(password);
  if (existing) {
    return prisma.account.update({
      where: { id: existing.id },
      data: {
        accountId: userId,
        providerId: 'credential',
        issuer: 'local:credential',
        password: hashedPassword,
      },
    });
  }
  return prisma.account.create({
    data: {
      id: randomUUID(),
      userId,
      accountId: userId,
      providerId: 'credential',
      issuer: 'local:credential',
      password: hashedPassword,
    },
  });
}

async function createSession(userId: string) {
  const token = randomBytes(32).toString('hex');
  return prisma.session.create({
    data: {
      id: randomUUID(),
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      userId,
      ipAddress: '127.0.0.1',
      userAgent: 'SeedScript/1.0',
    },
  });
}

async function seed() {
  try {
    console.log('🌱 Seeding users with commission rules...');

    // ----- Super Admin -----
    const superAdmin = await createOrUpdateUser('super@admin.com', {
      name: 'Super Admin',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      needPasswordChange: false,
    });
    await createOrUpdateAccount(superAdmin.id, 'Open@1234');
    await createSession(superAdmin.id);
    console.log('✓ Super admin (super@admin.com / Open@1234)');

    // ----- Demo User -----
    const demoUser = await createOrUpdateUser('user@gmail.com', {
      name: 'Demo User',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      needPasswordChange: false,
    });
    await createOrUpdateAccount(demoUser.id, 'Open@1234');
    await createSession(demoUser.id);
    console.log('✓ Demo user (user@gmail.com / Open@1234)');

    // ----- Owner -----
    const owner = await createOrUpdateUser('owner@gmail.com', {
      name: 'Demo Owner',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      needPasswordChange: false,
    });

    await createOrUpdateAccount(owner.id, 'Open@1234');
    await createSession(owner.id);

    console.log('✓ Owner (owner@gmail.com / Open@1234)');

  } catch (err) {
    console.error('❌ Seed failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

seed();