import { BadRequestException } from '@nestjs/common';
import { SkuPolicy } from './sku-policy';

describe('SkuPolicy', () => {
  it('normalizes valid SKU to uppercase canonical form', () => {
    expect(SkuPolicy.normalize('abc_1234')).toBe('ABC_1234');
  });

  it.each(['ABC 1234', 'ABCÇ1234', 'ABC.1234', 'ABC/1234', 'ABC123'])(
    'rejects invalid SKU %s',
    (sku) => {
      expect(() => SkuPolicy.normalize(sku)).toThrow(BadRequestException);
    },
  );

  it('rejects fully numeric SKU with leading zero', () => {
    expect(() => SkuPolicy.normalize('01234567')).toThrow(
      BadRequestException,
    );
  });

  it('allows alphanumeric SKU starting with zero', () => {
    expect(SkuPolicy.normalize('0ABC1234')).toBe('0ABC1234');
  });
});
