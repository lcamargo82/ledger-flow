import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListCashLedgerEntriesQueryDto } from './marketplace-financial-accounts.dto';

describe('ListCashLedgerEntriesQueryDto', () => {
  it('transforms HTTP query pagination values before integer validation', async () => {
    const query = plainToInstance(ListCashLedgerEntriesQueryDto, {
      page: '2',
      perPage: '20',
    });

    await expect(validate(query)).resolves.toHaveLength(0);
    expect(query).toMatchObject({ page: 2, perPage: 20 });
  });
});
