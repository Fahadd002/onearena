import { Prisma } from '../../generated/prisma/client';

type NumberingTransaction = Prisma.TransactionClient;

export async function nextDocumentNumber(
  tx: NumberingTransaction,
  prefix: 'INV' | 'PAY'| 'BK',
  year = new Date().getUTCFullYear(),
): Promise<string> {
  const key = `${prefix}-${year}`;
  const counter = await tx.numberingCounter.upsert({
    where: { key },
    create: { key, currentValue: 1 },
    update: { currentValue: { increment: 1 } },
    select: { currentValue: true },
  });

  return `${prefix}-${year}-${String(counter.currentValue).padStart(4, '0')}`;
}