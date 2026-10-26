import { randomBytes, randomUUID } from 'crypto';
import { hashPassword } from 'better-auth/crypto';
import prisma from '../../shared/prisma';
import {
  UserStatus,
  UserRole,
  FeatureType,
  FixedPeriod,
} from '../../generated/prisma/enums';

const CATEGORIES = [
  '⚽ Football',
  '🏏 Cricket',
  '🏸 Badminton',
  '🏐 Volleyball',
  '🥅 Futsal',
  '🎾 Tennis',
  '🏀 Basketball',
  '🏑 Hockey',
];

const FACILITIES = [
  '🚗 Parking',
  '🚿 Shower',
  '🚻 Changing Room',
  '🪑 Seating Area',
  '💡 Floodlights',
  '💧 Drinking Water',
  '🧑‍⚕️ First Aid',
  '🔒 Locker',
  '📺 Viewing Area',
  '🧹 Cleaning Service',
  '🛡️ Security',
  '🏆 Equipment Rental',
  '⚽ Sports Equipment',
];

const SUBSCRIPTION_PLANS = [
  {
    name: '🥈 Silver',
    tierLevel: 1,
    maxTurfs: 3,
    isFreeTrialAllowed: true,
    freeTrialDuration: 14,
    active: true,
    prices: [
      { period: FixedPeriod.MONTHLY, price: 1999 },
      { period: FixedPeriod.QUARTERLY, price: 5499 },
      { period: FixedPeriod.HALF_YEARLY, price: 9999 },
      { period: FixedPeriod.YEARLY, price: 19999 },
    ],
    features: [
      { name: '3 Turf Listings', description: 'List up to 3 turfs on the marketplace', type: FeatureType.GENERAL },
      { name: 'Advanced Analytics', description: 'View booking trends and revenue reports', type: FeatureType.PREMIUM, key: 'silver_analytics' },
      { name: 'Priority Support', description: 'Faster response times for support tickets', type: FeatureType.PREMIUM, key: 'silver_priority_support' },
      { name: '14-Day Free Trial', description: 'Try premium features free for 14 days', type: FeatureType.PREMIUM, key: 'silver_free_trial' },
    ],
  },
  {
    name: '🥇 Gold',
    tierLevel: 2,
    maxTurfs: 10,
    isFreeTrialAllowed: true,
    freeTrialDuration: 14,
    active: true,
    prices: [
      { period: FixedPeriod.MONTHLY, price: 4999 },
      { period: FixedPeriod.QUARTERLY, price: 13499 },
      { period: FixedPeriod.HALF_YEARLY, price: 24999 },
      { period: FixedPeriod.YEARLY, price: 49999 },
    ],
    features: [
      { name: '10 Turf Listings', description: 'List up to 10 turfs on the marketplace', type: FeatureType.GENERAL },
      { name: 'Advanced Analytics', description: 'View booking trends and revenue reports', type: FeatureType.PREMIUM, key: 'gold_analytics' },
      { name: 'Priority Support', description: 'Faster response times for support tickets', type: FeatureType.PREMIUM, key: 'gold_priority_support' },
      { name: 'Custom Branding', description: 'Customize your owner landing page', type: FeatureType.PREMIUM, key: 'gold_custom_branding' },
      { name: 'API Access', description: 'Integrate with external systems', type: FeatureType.PREMIUM, key: 'gold_api_access' },
      { name: '14-Day Free Trial', description: 'Try premium features free for 14 days', type: FeatureType.PREMIUM, key: 'gold_free_trial' },
    ],
  },
  {
    name: '💎 Platinum',
    tierLevel: 3,
    maxTurfs: 50,
    isFreeTrialAllowed: true,
    freeTrialDuration: 14,
    active: true,
    prices: [
      { period: FixedPeriod.MONTHLY, price: 9999 },
      { period: FixedPeriod.QUARTERLY, price: 26999 },
      { period: FixedPeriod.HALF_YEARLY, price: 49999 },
      { period: FixedPeriod.YEARLY, price: 99999 },
    ],
    features: [
      { name: '50 Turf Listings', description: 'List up to 50 turfs on the marketplace', type: FeatureType.GENERAL },
      { name: 'Advanced Analytics', description: 'View booking trends and revenue reports', type: FeatureType.PREMIUM, key: 'platinum_analytics' },
      { name: '24/7 Priority Support', description: 'Round-the-clock dedicated support', type: FeatureType.PREMIUM, key: 'platinum_priority_support' },
      { name: 'Custom Branding', description: 'Customize your owner landing page', type: FeatureType.PREMIUM, key: 'platinum_custom_branding' },
      { name: 'API Access', description: 'Integrate with external systems', type: FeatureType.PREMIUM, key: 'platinum_api_access' },
      { name: 'White Label', description: 'Remove OneArena branding', type: FeatureType.PREMIUM, key: 'platinum_white_label' },
      { name: 'Dedicated Account Manager', description: 'Personal account manager for your business', type: FeatureType.PREMIUM, key: 'platinum_account_manager' },
      { name: '14-Day Free Trial', description: 'Try premium features free for 14 days', type: FeatureType.PREMIUM, key: 'platinum_free_trial' },
    ],
  },
];

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

    // ----- Categories -----
    console.log('📂 Seeding categories...');
    for (const name of CATEGORIES) {
      await prisma.turfCategory.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      console.log(`  ✓ ${name}`);
    }

    // ----- Facilities -----
    console.log('🏗️ Seeding facilities...');
    for (const name of FACILITIES) {
      await prisma.facility.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      console.log(`  ✓ ${name}`);
    }

    // ----- Subscription Plans -----
    console.log('💳 Seeding subscription plans...');
    for (const planData of SUBSCRIPTION_PLANS) {
      const { prices, features, ...plan } = planData;
      const existingPlan = await prisma.subscriptionPlan.findUnique({
        where: { name: plan.name },
      });

      let planRecord;
      if (existingPlan) {
        planRecord = await prisma.subscriptionPlan.update({
          where: { name: plan.name },
          data: plan,
        });
      } else {
        planRecord = await prisma.subscriptionPlan.create({ data: plan });
      }
      console.log(`  ✓ ${plan.name}`);

      // Seed prices
      for (const price of prices) {
        await prisma.subscriptionPrice.upsert({
          where: {
            planId_period: {
              planId: planRecord.id,
              period: price.period,
            },
          },
          update: { price: price.price },
          create: {
            planId: planRecord.id,
            period: price.period,
            price: price.price,
          },
        });
      }

      // Seed features
      for (const feature of features) {
        await prisma.feature.upsert({
          where: {
            name_planId: {
              name: feature.name,
              planId: planRecord.id,
            },
          },
          update: { description: feature.description, type: feature.type, key: feature.key },
          create: {
            name: feature.name,
            description: feature.description,
            type: feature.type,
            key: feature.key,
            planId: planRecord.id,
          },
        });
      }
    }

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
