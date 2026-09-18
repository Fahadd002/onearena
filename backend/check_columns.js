const { PrismaClient } = require('./src/generated/prisma/client');
const prisma = new PrismaClient();

async function checkColumns() {
  const result = await prisma.$queryRaw`
    SELECT column_name FROM information_schema.columns WHERE table_name = 'subscription_plan'
  `;
  console.log(result);
  await prisma.$disconnect();
}

checkColumns().catch(console.error);