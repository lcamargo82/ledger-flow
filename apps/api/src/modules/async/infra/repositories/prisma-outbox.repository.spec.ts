import { PrismaOutboxRepository } from './prisma-outbox.repository';

describe('PrismaOutboxRepository', () => {
  it('acquires pending events using one UTC database clock for availability and leases', async () => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([]) };
    const repository = new PrismaOutboxRepository(prisma as never);

    await repository.findPendingAndLock(50, 'worker-1', 60_000);

    const [template, lockOwner, leaseDuration, batchSize] = prisma.$queryRaw.mock
      .calls[0] as unknown as [TemplateStringsArray, string, number, number];
    const sql = template.join('?').replace(/\s+/g, ' ');

    expect(sql.match(/CURRENT_TIMESTAMP AT TIME ZONE 'UTC'/g)).toHaveLength(4);
    expect(sql).toContain('"availableAt" <= CURRENT_TIMESTAMP AT TIME ZONE \'UTC\'');
    expect(sql).toContain('"leaseExpiresAt" < CURRENT_TIMESTAMP AT TIME ZONE \'UTC\'');
    expect(lockOwner).toBe('worker-1');
    expect(leaseDuration).toBe(60_000);
    expect(batchSize).toBe(50);
  });
});
